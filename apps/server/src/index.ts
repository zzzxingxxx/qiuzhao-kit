import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { dbPath } from "./db/index.js";
import { applicationRoutes } from "./routes/applications.js";
import { profileRoutes } from "./routes/profiles.js";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "127.0.0.1";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (!origin) return "*";
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
      if (origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://")) {
        return origin;
      }
      return "";
    },
  }),
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "qiuzhao-kit",
    db: dbPath,
    time: new Date().toISOString(),
  }),
);

app.route("/profiles", profileRoutes);
app.route("/applications", applicationRoutes);

app.notFound((c) => c.json({ error: "not_found" }, 404));

console.log(`[qiuzhao-kit] listening on http://${HOST}:${PORT}`);
console.log(`[qiuzhao-kit] sqlite ${dbPath}`);

serve({
  fetch: app.fetch,
  hostname: HOST,
  port: PORT,
});
