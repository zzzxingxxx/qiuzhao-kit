import { Hono } from "hono";
import {
  DEFAULT_QA,
  profileSchema,
  profileWriteSchema,
  type Profile,
} from "@qiuzhao/schema";
import { sqlite, type ProfileRow } from "../db/index.js";
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

profileRoutes.get("/", (c) => {
  const rows = sqlite.prepare("SELECT * FROM profiles ORDER BY updated_at DESC").all() as ProfileRow[];
  return c.json({ items: rows.map(rowToProfile) });
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
