import { Hono } from "hono";
import {
  applicationSchema,
  applicationWriteSchema,
  canTransition,
  type Application,
} from "@qiuzhao/schema";
import { sqlite, type ApplicationRow } from "../db/index.js";
import { newId, nowIso } from "../lib/time.js";

export const applicationRoutes = new Hono();

function rowToApplication(row: ApplicationRow): Application {
  return applicationSchema.parse(JSON.parse(row.payload));
}

applicationRoutes.get("/", (c) => {
  const rows = sqlite.prepare("SELECT * FROM applications ORDER BY updated_at DESC").all() as ApplicationRow[];
  return c.json({ items: rows.map(rowToApplication) });
});

applicationRoutes.get("/:id", (c) => {
  const id = c.req.param("id");
  const row = sqlite.prepare("SELECT * FROM applications WHERE id = ?").get(id) as ApplicationRow | undefined;
  if (!row) return c.json({ error: "application_not_found" }, 404);
  return c.json(rowToApplication(row));
});

applicationRoutes.post("/", async (c) => {
  const body = applicationWriteSchema.parse(await c.req.json().catch(() => ({})));
  const id = newId();
  const at = nowIso();
  const application = applicationSchema.parse({
    ...body,
    id,
    createdAt: at,
    updatedAt: at,
  });
  sqlite.prepare(
    `INSERT INTO applications (
      id, company, job_title, ats, apply_url, status, resume_version,
      filled_at, submitted_at, notes, missing_fields, payload, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    application.id,
    application.company,
    application.jobTitle,
    application.ats,
    application.applyUrl,
    application.status,
    application.resumeVersion,
    application.filledAt,
    application.submittedAt,
    application.notes,
    JSON.stringify(application.missingFields),
    JSON.stringify(application),
    application.createdAt,
    application.updatedAt,
  );
  return c.json(application, 201);
});

applicationRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = sqlite.prepare("SELECT * FROM applications WHERE id = ?").get(id) as ApplicationRow | undefined;
  if (!existing) return c.json({ error: "application_not_found" }, 404);
  const body = applicationWriteSchema.parse(await c.req.json());
  const current = rowToApplication(existing);
  if (body.status && !canTransition(current.status, body.status)) {
    return c.json({
      error: "illegal_status_transition",
      from: current.status,
      to: body.status,
    }, 400);
  }
  const at = nowIso();
  const application = applicationSchema.parse({
    ...current,
    ...body,
    id,
    createdAt: existing.created_at,
    updatedAt: at,
  });
  sqlite.prepare(
    `UPDATE applications SET
      company = ?, job_title = ?, ats = ?, apply_url = ?, status = ?, resume_version = ?,
      filled_at = ?, submitted_at = ?, notes = ?, missing_fields = ?, payload = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    application.company,
    application.jobTitle,
    application.ats,
    application.applyUrl,
    application.status,
    application.resumeVersion,
    application.filledAt,
    application.submittedAt,
    application.notes,
    JSON.stringify(application.missingFields),
    JSON.stringify(application),
    at,
    id,
  );
  return c.json(application);
});

applicationRoutes.delete("/:id", (c) => {
  const id = c.req.param("id");
  const existing = sqlite.prepare("SELECT * FROM applications WHERE id = ?").get(id) as ApplicationRow | undefined;
  if (!existing) return c.json({ error: "application_not_found" }, 404);
  sqlite.prepare("DELETE FROM applications WHERE id = ?").run(id);
  return c.json({ ok: true });
});
