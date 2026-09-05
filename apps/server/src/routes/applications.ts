import { Hono } from "hono";
import {
  applicationFromFillSchema,
  applicationSchema,
  applicationWriteSchema,
  canTransition,
  guessApplyMeta,
  normalizeApplyUrl,
  type Application,
  type ApplicationStatus,
  type Ats,
} from "@qiuzhao/schema";
import { sqlite, type ApplicationRow } from "../db/index.js";
import { newId, nowIso } from "../lib/time.js";

export const applicationRoutes = new Hono();

function rowToApplication(row: ApplicationRow): Application {
  return applicationSchema.parse(JSON.parse(row.payload));
}

function latestResumeVersion(): number | null {
  const row = sqlite.prepare("SELECT version FROM resumes ORDER BY updated_at DESC LIMIT 1").get() as
    | { version: number }
    | undefined;
  return row?.version ?? null;
}

function persist(application: Application, mode: "insert" | "update") {
  if (mode === "insert") {
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
    return;
  }
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
    application.updatedAt,
    application.id,
  );
}

function findByApplyUrl(url: string): Application | null {
  if (!url) return null;
  const rows = sqlite.prepare("SELECT * FROM applications").all() as ApplicationRow[];
  const hit = rows.find((row) => normalizeApplyUrl(row.apply_url) === url);
  return hit ? rowToApplication(hit) : null;
}

function stampStatus(application: Application, status: ApplicationStatus, at: string): Application {
  return {
    ...application,
    status,
    filledAt: status === "filled" ? application.filledAt || at : application.filledAt,
    submittedAt: status === "submitted" ? application.submittedAt || at : application.submittedAt,
  };
}

applicationRoutes.get("/", (c) => {
  const rows = sqlite.prepare("SELECT * FROM applications ORDER BY updated_at DESC").all() as ApplicationRow[];
  return c.json({ items: rows.map(rowToApplication) });
});

applicationRoutes.post("/from-fill", async (c) => {
  const body = applicationFromFillSchema.parse(await c.req.json());
  const applyUrl = normalizeApplyUrl(body.pageUrl);
  const guessed = guessApplyMeta(applyUrl, body.pageTitle ?? "");
  const at = nowIso();
  const existing = findByApplyUrl(applyUrl);
  const company = (body.company ?? "").trim() || existing?.company || guessed.company;
  const jobTitle = (body.jobTitle ?? "").trim() || existing?.jobTitle || guessed.jobTitle;
  const ats: Ats = body.ats ?? existing?.ats ?? "other";
  const missingFields = body.missingFields ?? existing?.missingFields ?? [];
  const resumeVersion = body.resumeVersion ?? existing?.resumeVersion ?? latestResumeVersion();

  let status: ApplicationStatus = "filled";
  if (existing) {
    if (existing.status === "draft" || existing.status === "rejected") status = "filled";
    else status = existing.status;
  }

  if (existing) {
    const application = stampStatus(
      applicationSchema.parse({
        ...existing,
        company,
        jobTitle,
        ats,
        applyUrl,
        missingFields,
        resumeVersion,
        notes: body.notes?.trim() || existing.notes,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: at,
      }),
      status,
      at,
    );
    persist({ ...application, updatedAt: at }, "update");
    return c.json({ ...application, updatedAt: at });
  }

  const application = applicationSchema.parse({
    id: newId(),
    company,
    jobTitle,
    ats,
    applyUrl,
    status: "filled",
    resumeVersion,
    filledAt: at,
    submittedAt: null,
    notes: body.notes ?? "",
    missingFields,
    createdAt: at,
    updatedAt: at,
  });
  persist(application, "insert");
  return c.json(application, 201);
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
  const applyUrl = body.applyUrl ? normalizeApplyUrl(body.applyUrl) : "";
  const application = stampStatus(
    applicationSchema.parse({
      ...body,
      applyUrl,
      id,
      createdAt: at,
      updatedAt: at,
    }),
    body.status ?? "draft",
    at,
  );
  persist(application, "insert");
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
      message: "不能这样改投递状态。",
      from: current.status,
      to: body.status,
    }, 400);
  }
  const at = nowIso();
  const applyUrl = body.applyUrl != null ? normalizeApplyUrl(body.applyUrl) : current.applyUrl;
  let application = applicationSchema.parse({
    ...current,
    ...body,
    applyUrl,
    id,
    createdAt: existing.created_at,
    updatedAt: at,
  });
  if (body.status) application = stampStatus(application, body.status, at);
  persist(application, "update");
  return c.json(application);
});

applicationRoutes.delete("/:id", (c) => {
  const id = c.req.param("id");
  const existing = sqlite.prepare("SELECT * FROM applications WHERE id = ?").get(id) as ApplicationRow | undefined;
  if (!existing) return c.json({ error: "application_not_found" }, 404);
  sqlite.prepare("DELETE FROM applications WHERE id = ?").run(id);
  return c.json({ ok: true });
});
