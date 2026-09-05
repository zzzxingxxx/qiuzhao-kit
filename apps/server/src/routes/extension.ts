import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";

export const extensionRoutes = new Hono();

type BrowserHit = { name: "Chrome" | "Edge"; path: string };

const DEFAULT_START = "http://127.0.0.1:5173/apply-demo.html";
const BUILD_MS = 180_000;

let buildLock: Promise<boolean> | null = null;

function findRepoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  const cwd = process.cwd();
  if (existsSync(join(cwd, "pnpm-workspace.yaml"))) return cwd;
  const up = resolve(cwd, "..", "..");
  if (existsSync(join(up, "pnpm-workspace.yaml"))) return up;
  throw new Error("找不到仓库根目录（缺少 pnpm-workspace.yaml）");
}

function localAppData(): string {
  return process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
}

function programFiles(): string[] {
  return [
    process.env.ProgramW6432,
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
    "C:\\Program Files",
    "C:\\Program Files (x86)",
  ].filter((item): item is string => Boolean(item));
}

function findBrowser(): BrowserHit | null {
  const envChrome = process.env.CHROME_PATH?.trim();
  if (envChrome && existsSync(envChrome)) return { name: "Chrome", path: envChrome };
  const envEdge = process.env.EDGE_PATH?.trim();
  if (envEdge && existsSync(envEdge)) return { name: "Edge", path: envEdge };

  const roots = programFiles();
  const local = localAppData();
  const chromeNames: BrowserHit[] = [
    ...roots.map((root) => ({ name: "Chrome" as const, path: join(root, "Google", "Chrome", "Application", "chrome.exe") })),
    { name: "Chrome", path: join(local, "Google", "Chrome", "Application", "chrome.exe") },
  ];
  const edgeNames: BrowserHit[] = [
    ...roots.map((root) => ({ name: "Edge" as const, path: join(root, "Microsoft", "Edge", "Application", "msedge.exe") })),
    { name: "Edge", path: join(local, "Microsoft", "Edge", "Application", "msedge.exe") },
  ];
  for (const item of [...chromeNames, ...edgeNames]) {
    if (existsSync(item.path)) return item;
  }
  return null;
}

function paths() {
  const repoRoot = findRepoRoot();
  return {
    repoRoot,
    extensionDir: join(repoRoot, "apps", "extension", ".output", "chrome-mv3"),
    profileDir: join(repoRoot, "apps", "server", "data", "chrome-ext-profile"),
  };
}

function isBuilt(extensionDir: string): boolean {
  return existsSync(join(extensionDir, "manifest.json"));
}

function runCommand(command: string, args: string[], cwd: string, timeoutMs: number): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, shell: true, windowsHide: true });
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("扩展构建超时"));
    }, timeoutMs);
    child.stderr?.on("data", (chunk) => {
      err += String(chunk);
    });
    child.stdout?.on("data", (chunk) => {
      err += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolvePromise();
        return;
      }
      const detail = err.trim().slice(-800) || `退出码 ${code}`;
      reject(new Error(`扩展构建失败：${detail}`));
    });
  });
}

async function ensureExtensionBuilt(repoRoot: string, extensionDir: string): Promise<boolean> {
  if (isBuilt(extensionDir)) return false;
  if (!buildLock) {
    buildLock = runCommand("pnpm", ["--filter", "@qiuzhao/extension", "build"], repoRoot, BUILD_MS)
      .then(() => {
        if (!isBuilt(extensionDir)) throw new Error("扩展构建完成但未找到 manifest.json");
        return true;
      })
      .finally(() => {
        buildLock = null;
      });
  }
  return buildLock;
}

function sanitizeStartUrl(raw: string | undefined): string | { error: string; message: string } {
  const text = (raw ?? "").trim();
  if (!text) return DEFAULT_START;
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    return { error: "invalid_url", message: "无效的打开地址" };
  }
  if (parsed.protocol !== "http:") {
    return { error: "invalid_url", message: "只允许打开本机 http 页面" };
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== "127.0.0.1" && host !== "localhost") {
    return { error: "invalid_url", message: "只允许打开 127.0.0.1 上的页面" };
  }
  parsed.username = "";
  parsed.password = "";
  parsed.hash = "";
  return parsed.toString();
}

function prepareProfile(profileDir: string) {
  mkdirSync(profileDir, { recursive: true });
  const firstRun = join(profileDir, "First Run");
  if (!existsSync(firstRun)) {
    writeFileSync(firstRun, "");
  }
}

function launchBrowser(browser: BrowserHit, extensionDir: string, profileDir: string, url: string) {
  prepareProfile(profileDir);
  const args = [
    `--user-data-dir=${profileDir}`,
    `--disable-extensions-except=${extensionDir}`,
    `--load-extension=${extensionDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-sync",
    "--disable-features=Translate,DisableLoadExtensionCommandLineSwitch",
    "--new-window",
    url,
  ];
  const child = spawn(browser.path, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.unref();
}

extensionRoutes.get("/status", (c) => {
  try {
    const { extensionDir, profileDir } = paths();
    const browser = findBrowser();
    return c.json({
      ok: true,
      browser: browser ? { name: browser.name, path: browser.path } : null,
      extensionDir,
      built: isBuilt(extensionDir),
      profileDir,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取扩展状态失败";
    return c.json({ error: "status_failed", message }, 500);
  }
});

extensionRoutes.post("/launch", async (c) => {
  let requested: string | undefined;
  try {
    const body = (await c.req.json()) as { url?: unknown };
    if (typeof body?.url === "string") requested = body.url;
  } catch {
    requested = undefined;
  }

  const startUrl = sanitizeStartUrl(requested);
  if (typeof startUrl !== "string") {
    return c.json(startUrl, 400);
  }

  const browser = findBrowser();
  if (!browser) {
    return c.json(
      {
        error: "no_browser",
        message: "未找到 Chrome 或 Edge。请安装后再点，或设置环境变量 CHROME_PATH / EDGE_PATH。",
      },
      400,
    );
  }

  let rebuilt = false;
  try {
    const { repoRoot, extensionDir, profileDir } = paths();
    rebuilt = await ensureExtensionBuilt(repoRoot, extensionDir);
    launchBrowser(browser, extensionDir, profileDir, startUrl);
    return c.json({
      ok: true,
      browser: browser.name,
      url: startUrl,
      rebuilt,
      extensionDir,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "打开预填浏览器失败";
    return c.json({ error: "launch_failed", message }, 500);
  }
});
