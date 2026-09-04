import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dataDir = path.resolve(process.env.DATA_DIR ?? path.join(process.cwd(), "data"));
fs.mkdirSync(dataDir, { recursive: true });

export const dbPath = path.join(dataDir, "app.db");
export const sqlite = new DatabaseSync(dbPath);

sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA foreign_keys = ON");
sqlite.exec(`
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  template_id TEXT NOT NULL DEFAULT 'campus-onepage',
  version INTEGER NOT NULL DEFAULT 0,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL DEFAULT '',
  job_title TEXT NOT NULL DEFAULT '',
  ats TEXT NOT NULL DEFAULT 'other',
  apply_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  resume_version INTEGER,
  filled_at TEXT,
  submitted_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  missing_fields TEXT NOT NULL DEFAULT '[]',
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);

export type ProfileRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  payload: string;
  created_at: string;
  updated_at: string;
};

export type ApplicationRow = {
  id: string;
  company: string;
  job_title: string;
  ats: string;
  apply_url: string;
  status: string;
  resume_version: number | null;
  filled_at: string | null;
  submitted_at: string | null;
  notes: string;
  missing_fields: string;
  payload: string;
  created_at: string;
  updated_at: string;
};
