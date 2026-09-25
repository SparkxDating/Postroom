import assert from "node:assert/strict";
import test from "node:test";
import { pgConnection, toPostgres } from "./sql";

test("rewrites ? placeholders for Postgres", () => {
  assert.equal(toPostgres("SELECT * FROM t WHERE a = ? AND b IN (?, ?)"), "SELECT * FROM t WHERE a = $1 AND b IN ($2, $3)");
});

test("TLS is off for localhost and required for hosted databases by default", () => {
  assert.equal(pgConnection("postgres://u:p@localhost:5432/db", "").ssl, false);
  assert.equal(pgConnection("postgres://u:p@127.0.0.1/db", "").ssl, false);
  assert.equal(pgConnection("postgres://u:p@db.abc.supabase.co:5432/postgres", "").ssl, "require");
});

test("sslmode in the URL is left to the driver", () => {
  const neon = pgConnection("postgresql://u:p@ep-x-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require", "");
  assert.equal(neon.ssl, undefined);
  assert.equal(neon.url.includes("channel_binding"), false);
  assert.equal(neon.url.includes("sslmode=require"), true);
  assert.equal(pgConnection("postgres://u:p@localhost/db?sslmode=disable", "").ssl, undefined);
});

test("DATABASE_SSL overrides everything", () => {
  assert.equal(pgConnection("postgres://u:p@db.example.com/db?sslmode=require", "disable").ssl, false);
  assert.equal(pgConnection("postgres://u:p@localhost/db", "require").ssl, "require");
  assert.equal(pgConnection("postgres://u:p@localhost/db", "true").ssl, "require");
  assert.equal(pgConnection("postgres://u:p@db.example.com/db", "verify-full").ssl, "verify-full");
  assert.throws(() => pgConnection("postgres://u:p@db.example.com/db", "sometimes"), /DATABASE_SSL/);
});
