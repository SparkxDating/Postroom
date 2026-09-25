import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA } from "./schema";

// Local SQLite fallback, used only when DATABASE_URL is not set (see sql.ts).
// It is loaded lazily so deployments on Postgres never load node:sqlite.

type OpenDb = {
  file: string;
  db: DatabaseSync;
};

let current: OpenDb | null = null;

export function dbFile(): string {
  if (process.env.POSTROOM_DB) return process.env.POSTROOM_DB;
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "postroom.db");
}

export function getDb(): DatabaseSync {
  const file = dbFile();
  if (current?.file === file) return current.db;
  current?.db.close();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // WAL lets the web app and the send worker write the same file.
  const db = new DatabaseSync(file, { timeout: 5000 });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  current = { file, db };
  return db;
}

export function resetDbForTests(): void {
  current?.db.close();
  current = null;
}
