import assert from "node:assert/strict";
import fs from "fs";
import test from "node:test";
import os from "os";
import path from "path";
import { signClick, readClickTarget } from "./crypto";
import { resetDbForTests, getDb } from "./db";
import {
  addContact,
  campaignStats,
  createList,
  createUser,
  getCampaign,
  importContacts,
  queueCampaign,
  recordClick,
  recordOpen,
  saveCampaign,
  setContactStatus,
  unsubscribe,
  updateSettings,
} from "./queries";
import { runBatch } from "./worker-cycle";

process.env.APP_SECRET = "test-secret-test-secret-test-secret";
process.env.SEND_DELAY_MS = "0";

test("capture send skips unsubscribed people and records opens, clicks, and unsubscribe", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "postroom-"));
  process.env.POSTROOM_DB = path.join(dir, "test.db");
  resetDbForTests();
  try {
    const user = createUser({ name: "Ada Lovelace", email: "owner@postroom.test", password: "password123" });
    updateSettings(user.id, {
      name: "Ada Lovelace",
      companyName: "Analytical Engines",
      postalAddress: "1 King Street\nLondon",
      fromName: "Ada",
      fromEmail: "owner@postroom.test",
      replyTo: "",
      smtpHost: "",
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: "",
      smtpPass: null,
    });
    const listId = createList(user.id, "Readers");
    addContact(user.id, { email: "ada@example.com", firstName: "Ada", lastName: "Lovelace", listId });
    addContact(user.id, { email: "grace@example.com", firstName: "Grace", lastName: "Hopper", listId });
    const grace = getDb().prepare("SELECT id FROM contacts WHERE email = ?").get("grace@example.com") as { id: string };
    setContactStatus(user.id, grace.id, "unsubscribed");
    const imported = importContacts(
      user.id,
      listId,
      "email,first name,last name\nada@example.com,Ada,Updated\nlinus@example.com,Linus,Torvalds\nnot-an-email,No,One\ngrace@example.com,Grace,Still\n",
    );
    assert.equal(imported.created, 1);
    assert.equal(imported.updated, 2);
    assert.equal(imported.invalid, 1);
    assert.equal(imported.keptUnsubscribed, 1);

    const campaignId = saveCampaign(user.id, {
      name: "Hello",
      subject: "Hello {{first_name}}",
      html: `<p>Hi {{first_name}}</p><p><a href="https://example.com/hello">Read</a></p>`,
      listId,
      fromName: "Ada",
      fromEmail: "owner@postroom.test",
      replyTo: "",
    });
    assert.equal(queueCampaign(user.id, campaignId, "http://localhost:3010").queued, 2);

    const linus = getDb().prepare("SELECT unsub_token FROM contacts WHERE email = ?").get("linus@example.com") as {
      unsub_token: string;
    };
    unsubscribe(linus.unsub_token, campaignId);
    assert.equal(await runBatch(10), 2);

    const campaign = getCampaign(user.id, campaignId);
    assert.equal(campaign?.status, "sent");
    const delivery = getDb()
      .prepare(
        `SELECT d.html, d.subject, d.mode FROM deliveries d
         JOIN recipients r ON r.id = d.recipient_id WHERE r.email = ?`,
      )
      .get("ada@example.com") as { html: string; subject: string; mode: string };
    assert.equal(delivery.mode, "capture");
    assert.equal(delivery.subject, "Hello Ada");
    assert.match(delivery.html, /Hi Ada/);
    assert.equal(delivery.html.includes('href="https://example.com/hello"'), false);
    assert.match(delivery.html, /\/t\/c\//);
    assert.match(delivery.html, /\/t\/o\//);
    assert.match(delivery.html, /Analytical Engines/);
    assert.match(delivery.html, /\/u\//);

    const tokenRow = getDb().prepare("SELECT token FROM recipients WHERE email = ?").get("ada@example.com") as {
      token: string;
    };
    recordOpen(tokenRow.token);
    const signed = signClick(tokenRow.token, "https://example.com/hello");
    assert.equal(readClickTarget(tokenRow.token, signed.payload, signed.signature), "https://example.com/hello");
    assert.equal(readClickTarget(tokenRow.token, signed.payload, "nope"), null);
    recordClick(tokenRow.token, "https://example.com/hello");
    const stats = campaignStats(campaignId);
    assert.equal(stats.sent, 1);
    assert.equal(stats.skipped, 1);
    assert.equal(stats.uniqueOpens, 1);
    assert.equal(stats.uniqueClicks, 1);
    assert.equal(stats.unsubscribes, 1);
    const graceStatus = getDb().prepare("SELECT status FROM contacts WHERE email = ?").get("grace@example.com") as {
      status: string;
    };
    assert.equal(graceStatus.status, "unsubscribed");
  } finally {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
