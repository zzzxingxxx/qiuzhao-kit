import { Hono } from "hono";
import {
  extensionDirOf,
  findBrowser,
  findRepoRoot,
  isBuilt,
  isExtensionInstalled,
  loadIntoCurrentBrowser,
} from "../lib/chrome-ext.js";

export const extensionRoutes = new Hono();

function hintFromRequest(c: { req: { header: (name: string) => string | undefined } }, bodyHint?: unknown): string | undefined {
  if (bodyHint === "edge" || bodyHint === "chrome") return bodyHint;
  const ua = c.req.header("user-agent") ?? "";
  if (/Edg\//i.test(ua)) return "edge";
  if (/Chrome\//i.test(ua)) return "chrome";
  return undefined;
}

extensionRoutes.get("/status", (c) => {
  try {
    const hint = hintFromRequest(c);
    const repoRoot = findRepoRoot();
    const extensionDir = extensionDirOf(repoRoot);
    const browser = findBrowser(hint);
    return c.json({
      ok: true,
      browser: browser ? { name: browser.name, path: browser.path } : null,
      extensionDir,
      built: isBuilt(extensionDir),
      installed: browser ? isExtensionInstalled(browser, extensionDir) : false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取扩展状态失败";
    return c.json({ error: "status_failed", message }, 500);
  }
});

extensionRoutes.post("/load", async (c) => {
  let bodyHint: unknown;
  try {
    const body = (await c.req.json()) as { browser?: unknown };
    bodyHint = body?.browser;
  } catch {
    bodyHint = undefined;
  }
  try {
    const result = await loadIntoCurrentBrowser(hintFromRequest(c, bodyHint));
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "加载扩展失败";
    return c.json({ error: "load_failed", message }, 500);
  }
});
