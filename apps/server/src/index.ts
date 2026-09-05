import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { Hono, type Context } from "hono";
import { dbPath } from "./db/index.js";
import { findRepoRoot } from "./lib/repo.js";
import { aiRoutes } from "./routes/ai.js";
import { applicationRoutes } from "./routes/applications.js";
import { profileRoutes } from "./routes/profiles.js";
import { resumeRoutes } from "./routes/resumes.js";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "127.0.0.1";

const app = new Hono();

function applyCors(c: Context) {
  const origin = c.req.header("Origin") || "*";
  c.header("Access-Control-Allow-Origin", origin);
  c.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type");
  c.header("Access-Control-Allow-Private-Network", "true");
  c.header("Vary", "Origin");
}

app.use("/*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    applyCors(c);
    return c.body(null, 204);
  }
  await next();
  applyCors(c);
});

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "qiuzhao-kit",
    db: dbPath,
    time: new Date().toISOString(),
  }),
);

app.get("/prefill-inject.js", (c) => {
  try {
    const file = join(findRepoRoot(), "apps", "web", "public", "prefill-inject.js");
    if (!existsSync(file)) {
      return c.json({ error: "missing_inject", message: "预填脚本尚未生成，请先启动网页 http://127.0.0.1:5173" }, 503);
    }
    c.header("Content-Type", "text/javascript; charset=utf-8");
    c.header("Cache-Control", "no-cache");
    return c.body(readFileSync(file, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取预填脚本失败";
    return c.json({ error: "inject_failed", message }, 500);
  }
});

app.route("/profiles", profileRoutes);
app.route("/resumes", resumeRoutes);
app.route("/applications", applicationRoutes);
app.route("/ai", aiRoutes);

app.onError((err, c) => {
  if (err.name === "ZodError") {
    return c.json({ error: "invalid_payload", issues: (err as { issues?: unknown }).issues }, 400);
  }
  console.error(err);
  return c.json({ error: "internal_error" }, 500);
});

app.notFound((c) => c.json({ error: "not_found" }, 404));

console.log(`[qiuzhao-kit] listening on http://${HOST}:${PORT}`);
console.log(`[qiuzhao-kit] sqlite ${dbPath}`);

serve({
  fetch: app.fetch,
  hostname: HOST,
  port: PORT,
});
