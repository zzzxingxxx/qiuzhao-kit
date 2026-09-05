import { Hono } from "hono";
import { applyFillCapture } from "@qiuzhao/fill";
import {
  DEFAULT_QA,
  fillCaptureRequestSchema,
  normalizeResume,
  profileSchema,
  profileWriteSchema,
  resumeSchema,
  type Profile,
  type Resume,
} from "@qiuzhao/schema";
import { sqlite, type ProfileRow, type ResumeRow } from "../db/index.js";
import { newId, nowIso } from "../lib/time.js";

export const profileRoutes = new Hono();

function rowToProfile(row: ProfileRow): Profile {
  return profileSchema.parse(JSON.parse(row.payload));
}

function emptyProfile(id: string, at: string): Profile {
  return profileSchema.parse({
    id,
    qa: DEFAULT_QA,
    createdAt: at,
    updatedAt: at,
  });
}

function pickPrimaryProfile(items: Profile[]): Profile | null {
  if (!items.length) return null;
  return (
    items.find((item) => item.name.trim()) ??
    items.find((item) => item.phone.trim() || item.email.trim()) ??
    items[0]
  );
}

function persistProfile(profile: Profile) {
  sqlite
    .prepare(`UPDATE profiles SET name = ?, phone = ?, email = ?, payload = ?, updated_at = ? WHERE id = ?`)
    .run(profile.name, profile.phone, profile.email, JSON.stringify(profile), profile.updatedAt, profile.id);
}

function persistResume(resume: Resume) {
  sqlite
    .prepare(`UPDATE resumes SET profile_id = ?, template_id = ?, version = ?, payload = ?, updated_at = ? WHERE id = ?`)
    .run(resume.profileId, resume.templateId, resume.version, JSON.stringify(resume), resume.updatedAt, resume.id);
}

function loadResume(id: string | undefined, profileId: string): Resume | null {
  if (id) {
    const row = sqlite.prepare("SELECT * FROM resumes WHERE id = ?").get(id) as ResumeRow | undefined;
    return row ? normalizeResume(resumeSchema.parse(JSON.parse(row.payload))) : null;
  }
  const owned = sqlite
    .prepare("SELECT * FROM resumes WHERE profile_id = ? ORDER BY updated_at DESC")
    .all(profileId) as ResumeRow[];
  const row = owned[0];
  return row ? normalizeResume(resumeSchema.parse(JSON.parse(row.payload))) : null;
}

profileRoutes.get("/", (c) => {
  const rows = sqlite.prepare("SELECT * FROM profiles ORDER BY updated_at DESC").all() as ProfileRow[];
  return c.json({ items: rows.map(rowToProfile) });
});

profileRoutes.post("/capture", async (c) => {
  const body = fillCaptureRequestSchema.parse(await c.req.json());
  const rows = sqlite.prepare("SELECT * FROM profiles ORDER BY updated_at DESC").all() as ProfileRow[];
  const picked = body.profileId
    ? rows.map(rowToProfile).find((item) => item.id === body.profileId)
    : pickPrimaryProfile(rows.map(rowToProfile));
  if (!picked) return c.json({ error: "profile_missing", message: "请先在网页填写档案。" }, 400);
  const resume = loadResume(body.resumeId, picked.id);
  const result = applyFillCapture(picked, resume, body.items, { overwrite: Boolean(body.overwrite) });
  const at = nowIso();
  if (result.applied.length) {
    result.profile.updatedAt = at;
    persistProfile(result.profile);
  }
  if (result.resume && result.resumeChanged) {
    result.resume.updatedAt = at;
    persistResume(result.resume);
  }
  return c.json({
    profileId: result.profile.id,
    resumeId: result.resume?.id,
    applied: result.applied,
    skipped: result.skipped,
  });
});

profileRoutes.get("/:id", (c) => {
  const id = c.req.param("id");
  const row = sqlite.prepare("SELECT * FROM profiles WHERE id = ?").get(id) as ProfileRow | undefined;
  if (!row) return c.json({ error: "profile_not_found" }, 404);
  return c.json(rowToProfile(row));
});

profileRoutes.post("/", async (c) => {
  const body = profileWriteSchema.parse(await c.req.json().catch(() => ({})));
  const id = newId();
  const at = nowIso();
  const profile = profileSchema.parse({
    ...emptyProfile(id, at),
    ...body,
    id,
    createdAt: at,
    updatedAt: at,
  });
  sqlite.prepare(
    `INSERT INTO profiles (id, name, phone, email, payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(profile.id, profile.name, profile.phone, profile.email, JSON.stringify(profile), profile.createdAt, profile.updatedAt);
  return c.json(profile, 201);
});

profileRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = sqlite.prepare("SELECT * FROM profiles WHERE id = ?").get(id) as ProfileRow | undefined;
  if (!existing) return c.json({ error: "profile_not_found" }, 404);
  const body = profileWriteSchema.parse(await c.req.json());
  const at = nowIso();
  const profile = profileSchema.parse({
    ...JSON.parse(existing.payload),
    ...body,
    id,
    createdAt: existing.created_at,
    updatedAt: at,
  });
  sqlite.prepare(
    `UPDATE profiles SET name = ?, phone = ?, email = ?, payload = ?, updated_at = ? WHERE id = ?`,
  ).run(profile.name, profile.phone, profile.email, JSON.stringify(profile), at, id);
  return c.json(profile);
});

profileRoutes.delete("/:id", (c) => {
  const id = c.req.param("id");
  const existing = sqlite.prepare("SELECT * FROM profiles WHERE id = ?").get(id) as ProfileRow | undefined;
  if (!existing) return c.json({ error: "profile_not_found" }, 404);
  sqlite.prepare("DELETE FROM profiles WHERE id = ?").run(id);
  return c.json({ ok: true });
});
