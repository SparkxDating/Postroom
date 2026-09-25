import assert from "node:assert/strict";
import test from "node:test";
import { parseCsv, readContactCsv } from "./csv";
import { UserError } from "./user-error";

test("parses quoted commas, escaped quotes, and a byte order mark", () => {
  const rows = parseCsv('\uFEFFemail,first name,note\n"ada@example.com","Ada, A","She said ""hello"""\r\nbob@example.com,Bob,Plain\n');
  assert.deepEqual(rows[0], ["email", "first name", "note"]);
  assert.deepEqual(rows[1], ["ada@example.com", "Ada, A", 'She said "hello"']);
  assert.deepEqual(rows[2], ["bob@example.com", "Bob", "Plain"]);
});

test("maps contact headers and counts invalid emails", () => {
  const result = readContactCsv("e-mail,given name,surname\nAda@Example.com,Ada,Lovelace\nnot-an-email,No,One\n");
  assert.equal(result.invalid, 1);
  assert.equal(result.contacts.length, 1);
  assert.equal(result.contacts[0].email, "ada@example.com");
  assert.equal(result.contacts[0].firstName, "Ada");
  assert.equal(result.contacts[0].lastName, "Lovelace");
});

test("requires an email column", () => {
  assert.throws(() => readContactCsv("name\nAda\n"), UserError);
});
