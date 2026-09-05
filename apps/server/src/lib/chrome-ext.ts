import { execFile, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type BrowserHit = { name: "Chrome" | "Edge"; path: string; userDataDir: string; processName: string };

export type LoadResult = {
  ok: true;
  browser: "Chrome" | "Edge";
  rebuilt: boolean;
  installed: boolean;
  already: boolean;
  restarting: boolean;
};

const BUILD_MS = 180_000;
let buildLock: Promise<boolean> | null = null;
let loadLock: Promise<LoadResult> | null = null;

export function findRepoRoot(): string {
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

export function extensionDirOf(repoRoot: string): string {
  return join(repoRoot, "apps", "extension", ".output", "chrome-mv3");
}

export function isBuilt(extensionDir: string): boolean {
  return existsSync(join(extensionDir, "manifest.json"));
}

export function findBrowser(hint?: string): BrowserHit | null {
  const wantEdge = hint === "edge";
  const envChrome = process.env.CHROME_PATH?.trim();
  const envEdge = process.env.EDGE_PATH?.trim();
  const roots = programFiles();
  const local = localAppData();

  const chromePaths = [
    envChrome,
    ...roots.map((root) => join(root, "Google", "Chrome", "Application", "chrome.exe")),
    join(local, "Google", "Chrome", "Application", "chrome.exe"),
  ].filter((item): item is string => Boolean(item));

  const edgePaths = [
    envEdge,
    ...roots.map((root) => join(root, "Microsoft", "Edge", "Application", "msedge.exe")),
    join(local, "Microsoft", "Edge", "Application", "msedge.exe"),
  ].filter((item): item is string => Boolean(item));

  const chromeDir = join(local, "Google", "Chrome", "User Data");
  const edgeDir = join(local, "Microsoft", "Edge", "User Data");

  const chrome = chromePaths.find((path) => existsSync(path));
  const edge = edgePaths.find((path) => existsSync(path));

  if (wantEdge && edge) {
    return { name: "Edge", path: edge, userDataDir: edgeDir, processName: "msedge.exe" };
  }
  if (chrome) {
    return { name: "Chrome", path: chrome, userDataDir: chromeDir, processName: "chrome.exe" };
  }
  if (edge) {
    return { name: "Edge", path: edge, userDataDir: edgeDir, processName: "msedge.exe" };
  }
  return null;
}

function runCommand(command: string, args: string[], cwd: string, timeoutMs: number): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, shell: true, windowsHide: true });
    let out = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("命令超时"));
    }, timeoutMs);
    child.stdout?.on("data", (chunk) => {
      out += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      out += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolvePromise(out);
        return;
      }
      reject(new Error(out.trim().slice(-800) || `退出码 ${code}`));
    });
  });
}

export async function ensureExtensionBuilt(repoRoot: string, extensionDir: string): Promise<boolean> {
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

function textHasPath(text: string, extensionDir: string): boolean {
  const resolved = resolve(extensionDir);
  const variants = [resolved, resolved.replace(/\\/g, "\\\\"), resolved.replace(/\\/g, "/"), resolved.replace(/\\/g, "\\/")];
  return variants.some((item) => text.includes(item));
}

export function isExtensionInstalled(browser: BrowserHit, extensionDir: string): boolean {
  const defaults = ["Default", "Profile 1", "Profile 2"];
  for (const profile of defaults) {
    for (const file of ["Secure Preferences", "Preferences"]) {
      const full = join(browser.userDataDir, profile, file);
      if (!existsSync(full)) continue;
      try {
        if (textHasPath(readFileSync(full, "utf8"), extensionDir)) return true;
      } catch {
        /* ignore locked/partial files */
      }
    }
  }
  return false;
}

function extensionsUrl(browser: BrowserHit): string {
  return browser.name === "Edge" ? "edge://extensions" : "chrome://extensions";
}

function spawnBrowser(browser: BrowserHit, args: string[]) {
  const child = spawn(browser.path, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.unref();
}

function sleep(ms: number) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function psEncoded(script: string): string {
  return Buffer.from(script, "utf16le").toString("base64");
}

function loaderScript(extensionDir: string, timeoutSec: number): string {
  const dir = extensionDir.replace(/'/g, "''");
  return `
$ErrorActionPreference = 'Continue'
$ExtensionDir = '${dir}'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

function Find-Named($root, [string[]]$names) {
  foreach ($n in $names) {
    $c = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, $n)
    $el = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $c)
    if ($el) { return $el }
  }
  return $null
}

function Invoke-El($el) {
  $p = $el.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
  $p.Invoke()
}

$loadNames = @('加载已解压的扩展程序','加载已解压的扩展','Load unpacked','Load unpacked extension')
$devNames = @('开发者模式','Developer mode')
$okNames = @('选择文件夹','Select Folder','选择','OK')
$deadline = (Get-Date).AddSeconds(${Math.max(3, timeoutSec)})
$btn = $null
while ((Get-Date) -lt $deadline) {
  $root = [System.Windows.Automation.AutomationElement]::RootElement
  $dev = Find-Named $root $devNames
  if ($dev) {
    try {
      $tog = $dev.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern)
      if ($tog.Current.ToggleState -ne [System.Windows.Automation.ToggleState]::On) { $tog.Toggle() }
    } catch {
      try { Invoke-El $dev } catch {}
    }
  }
  $btn = Find-Named $root $loadNames
  if ($btn) { break }
  Start-Sleep -Milliseconds 350
}
if (-not $btn) { Write-Output 'NO_LOAD_BUTTON'; exit 2 }
Invoke-El $btn
Start-Sleep -Milliseconds 700

$dialog = $null
$d2 = (Get-Date).AddSeconds(10)
while ((Get-Date) -lt $d2) {
  $root = [System.Windows.Automation.AutomationElement]::RootElement
  foreach ($title in @('选择文件夹','浏览文件夹','Select Folder','Browse For Folder','打开','Open')) {
    $c = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, $title)
    $dialog = $root.FindFirst([System.Windows.Automation.TreeScope]::Children, $c)
    if ($dialog) { break }
  }
  if (-not $dialog) {
    $c = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ClassNameProperty, '#32770')
    $dialog = $root.FindFirst([System.Windows.Automation.TreeScope]::Children, $c)
  }
  if ($dialog) { break }
  Start-Sleep -Milliseconds 250
}
if (-not $dialog) { Write-Output 'NO_DIALOG'; exit 3 }

try { $dialog.SetFocus() } catch {}
Start-Sleep -Milliseconds 200
$oldClip = $null
try { $oldClip = Get-Clipboard -Raw -ErrorAction SilentlyContinue } catch {}
try { Set-Clipboard -Value $ExtensionDir } catch {}
$wshell = New-Object -ComObject WScript.Shell
$wshell.SendKeys('^l')
Start-Sleep -Milliseconds 220
$wshell.SendKeys('^a')
Start-Sleep -Milliseconds 80
$wshell.SendKeys('^v')
Start-Sleep -Milliseconds 220
$wshell.SendKeys('{ENTER}')
Start-Sleep -Milliseconds 450
$ok = Find-Named $dialog $okNames
if ($ok) { Invoke-El $ok } else { $wshell.SendKeys('%s'); Start-Sleep -Milliseconds 180; $wshell.SendKeys('{ENTER}') }
if ($null -ne $oldClip) { try { Set-Clipboard -Value $oldClip } catch {} }
Write-Output 'OK'
exit 0
`;
}

async function runUnpackedLoader(extensionDir: string, timeoutSec = 16): Promise<{ code: number; out: string }> {
  const encoded = psEncoded(loaderScript(extensionDir, timeoutSec));
  return new Promise((resolvePromise) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-STA", "-EncodedCommand", encoded], {
      windowsHide: true,
    });
    let out = "";
    const timer = setTimeout(() => {
      child.kill();
      resolvePromise({ code: 4, out: out || "UIA_TIMEOUT" });
    }, (timeoutSec + 12) * 1000);
    child.stdout?.on("data", (chunk) => {
      out += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      out += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolvePromise({ code: 5, out: error.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({ code: code ?? 1, out });
    });
  });
}

async function isProcessRunning(name: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("tasklist", ["/FI", `IMAGENAME eq ${name}`, "/NH"]);
    return stdout.toLowerCase().includes(name.toLowerCase());
  } catch {
    return false;
  }
}

async function quitBrowser(browser: BrowserHit) {
  try {
    await execFileAsync("taskkill", ["/IM", browser.processName, "/F"]);
  } catch {
    /* not running */
  }
  for (let i = 0; i < 24; i++) {
    if (!(await isProcessRunning(browser.processName))) break;
    await sleep(250);
  }
  await sleep(500);
}

function loadArgs(browser: BrowserHit, extensionDir: string): string[] {
  return [
    `--load-extension=${extensionDir}`,
    "--disable-features=DisableLoadExtensionCommandLineSwitch",
    "--force-renderer-accessibility",
    "--restore-last-session",
    extensionsUrl(browser),
  ];
}

export async function restartAndLoadUnpacked(browser: BrowserHit, extensionDir: string): Promise<void> {
  await quitBrowser(browser);
  spawnBrowser(browser, loadArgs(browser, extensionDir));
  await sleep(4500);
  await runUnpackedLoader(extensionDir, 16);
  await sleep(800);
}

export async function loadIntoCurrentBrowser(hint?: string): Promise<LoadResult> {
  if (loadLock) return loadLock;
  loadLock = (async () => {
    const repoRoot = findRepoRoot();
    const extensionDir = extensionDirOf(repoRoot);
    const browser = findBrowser(hint);
    if (!browser) {
      throw new Error("未找到 Chrome。请先安装 Chrome 后再点「加载扩展」。");
    }
    const rebuilt = await ensureExtensionBuilt(repoRoot, extensionDir);
    if (isExtensionInstalled(browser, extensionDir)) {
      return {
        ok: true as const,
        browser: browser.name,
        rebuilt,
        installed: true,
        already: true,
        restarting: false,
      };
    }

    spawnBrowser(browser, [extensionsUrl(browser)]);
    await sleep(1200);
    await runUnpackedLoader(extensionDir, 4);
    await sleep(400);

    if (isExtensionInstalled(browser, extensionDir)) {
      return {
        ok: true as const,
        browser: browser.name,
        rebuilt,
        installed: true,
        already: false,
        restarting: false,
      };
    }

    setTimeout(() => {
      restartAndLoadUnpacked(browser, extensionDir).catch((error) => {
        console.error("[qiuzhao-kit] load extension fallback failed", error);
      });
    }, 1500);

    return {
      ok: true as const,
      browser: browser.name,
      rebuilt,
      installed: false,
      already: false,
      restarting: true,
    };
  })().finally(() => {
    loadLock = null;
  });
  return loadLock;
}
