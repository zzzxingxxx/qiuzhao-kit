import { Hono } from "hono";
import {
  createResumeFromProfile,
  normalizeResume,
  profileSchema,
  resumeSchema,
  resumeWriteSchema,
  type Resume,
} from "@qiuzhao/schema";
import { sqlite, type ProfileRow, type ResumeRow } from "../db/index.js";
import { newId, nowIso } from "../lib/time.js";

export const resumeRoutes = new Hono();

function rowToResume(row: ResumeRow): Resume {
  return normalizeResume(resumeSchema.parse(JSON.parse(row.payload)));
}

function persist(resume: Resume, isNew: boolean) {
  const args = [
    resume.profileId,
    resume.templateId,
    resume.version,
    JSON.stringify(resume),
    resume.updatedAt,
    resume.id,
  ];
  if (isNew) {
    sqlite.prepare(
      `INSERT INTO resumes (id, profile_id, template_id, version, payload, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(resume.id, resume.profileId, resume.templateId, resume.version, JSON.stringify(resume), resume.createdAt, resume.updatedAt);
    return;
  }
  sqlite.prepare(
    `UPDATE resumes SET profile_id = ?, template_id = ?, version = ?, payload = ?, updated_at = ? WHERE id = ?`,
  ).run(...args);
}

resumeRoutes.get("/", (c) => {
  const profileId = c.req.query("profileId");
  const sql = profileId
    ? sqlite.prepare("SELECT * FROM resumes WHERE profile_id = ? ORDER BY updated_at DESC")
    : sqlite.prepare("SELECT * FROM resumes ORDER BY updated_at DESC");
  const rows = (profileId ? sql.all(profileId) : sql.all()) as ResumeRow[];
  return c.json({ items: rows.map(rowToResume) });
});

resumeRoutes.get("/:id", (c) => {
  const row = sqlite.prepare("SELECT * FROM resumes WHERE id = ?").get(c.req.param("id")) as ResumeRow | undefined;
  if (!row) return c.json({ error: "resume_not_found" }, 404);
  return c.json(rowToResume(row));
});

resumeRoutes.post("/", async (c) => {
  const body = resumeWriteSchema.parse(await c.req.json().catch(() => ({})));
  const id = newId();
  const at = nowIso();
  if (body.profileId) {
    const profileRow = sqlite.prepare("SELECT * FROM profiles WHERE id = ?").get(body.profileId) as ProfileRow | undefined;
    if (!profileRow) return c.json({ error: "profile_not_found" }, 404);
    const profile = profileSchema.parse(JSON.parse(profileRow.payload));
    const resume = normalizeResume(resumeSchema.parse({
      ...createResumeFromProfile(profile, id, at),
      ...body,
      id,
      profileId: profile.id,
      createdAt: at,
      updatedAt: at,
    }));
    persist(resume, true);
    return c.json(resume, 201);
  }
  const resume = normalizeResume(resumeSchema.parse({
    ...body,
    id,
    profileId: body.profileId ?? "",
    createdAt: at,
    updatedAt: at,
  }));
  persist(resume, true);
  return c.json(resume, 201);
});

resumeRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = sqlite.prepare("SELECT * FROM resumes WHERE id = ?").get(id) as ResumeRow | undefined;
  if (!existing) return c.json({ error: "resume_not_found" }, 404);
  const body = resumeWriteSchema.parse(await c.req.json());
  const at = nowIso();
  const resume = normalizeResume(resumeSchema.parse({
    ...JSON.parse(existing.payload),
    ...body,
    id,
    createdAt: existing.created_at,
    updatedAt: at,
  }));
  persist(resume, false);
  return c.json(resume);
});
