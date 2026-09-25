import bcrypt from "bcryptjs";
import { readContactCsv, toCsv } from "./csv";
import { decryptSecret, encryptSecret, newId, newToken } from "./crypto";
import type { SQLInputValue } from "node:sqlite";
import { changesOf, getDb } from "./db";
import { STARTER_TEMPLATES } from "./templates";
import { addDaysIso, nowIso } from "./time";
import type {
  Account,
  Campaign,
  CampaignStats,
  ClickStat,
  Contact,
  ContactList,
  Dashboard,
  DeliveryView,
  FailureRow,
  ImportResult,
  Page,
  SendJob,
  SettingsInput,
  Template,
} from "./types";
import { UserError } from "./user-error";
import { isEmail, normalizeEmail, sendBlockers } from "./validators";

const PAGE_SIZE = 50;

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  company_name: string;
  postal_address: string;
  from_name: string;
  from_email: string;
  reply_to: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: number;
  smtp_user: string;
  smtp_pass: string;
  created_at: string;
};

const USER_COLUMNS = `id, email, password_hash, name, company_name, postal_address, from_name, from_email, reply_to,
  smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, created_at`;

function toAccount(row: UserRow): Account {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    companyName: row.company_name,
    postalAddress: row.postal_address,
    fromName: row.from_name,
    fromEmail: row.from_email,
    replyTo: row.reply_to,
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    smtpSecure: row.smtp_secure === 1,
    smtpUser: row.smtp_user,
    smtpConfigured: row.smtp_host.trim() !== "",
    hasSmtpPassword: row.smtp_pass.trim() !== "",
    createdAt: row.created_at,
  };
}

function userById(id: string): UserRow | null {
  return (getDb().prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(id) as UserRow | undefined) ?? null;
}

function requireOwnedUser(id: string): UserRow {
  const row = userById(id);
  if (!row) throw new UserError("Account not found.");
  return row;
}

export function createUser(input: { name: string; email: string; password: string }): Account {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  if (name.length < 1 || name.length > 80) throw new UserError("Enter your name.");
  if (!isEmail(email)) throw new UserError("Enter a valid email.");
  if (input.password.length < 8) throw new UserError("Use at least 8 characters for the password.");
  const existing = getDb().prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) throw new UserError("An account with that email already exists.");
  const id = newId();
  const createdAt = nowIso();
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, from_name, from_email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, email, bcrypt.hashSync(input.password, 10), name, name, email, createdAt);
    const insertTemplate = db.prepare(
      `INSERT INTO templates (id, user_id, name, subject, html, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const template of STARTER_TEMPLATES) {
      insertTemplate.run(newId(), id, template.name, template.subject, template.html.trim(), createdAt, createdAt);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return toAccount(requireOwnedUser(id));
}

let dummyHash: string | null = null;

export function verifyPassword(email: string, password: string): Account | null {
  const row = getDb().prepare(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`).get(normalizeEmail(email)) as
    | UserRow
    | undefined;
  const hash = row?.password_hash ?? (dummyHash ??= bcrypt.hashSync("postroom-dummy-password", 10));
  const ok = bcrypt.compareSync(password, hash);
  if (!row || !ok) return null;
  return toAccount(row);
}

export function createSession(userId: string): string {
  const id = newToken();
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(nowIso());
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(id, userId, addDaysIso(30));
  return id;
}

export function deleteSession(id: string): void {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

export function accountForSession(sessionId: string): Account | null {
  const row = getDb()
    .prepare(
      `SELECT ${USER_COLUMNS.split(",")
        .map((column) => `u.${column.trim()}`)
        .join(", ")}
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > ?`,
    )
    .get(sessionId, nowIso()) as UserRow | undefined;
  return row ? toAccount(row) : null;
}

export function updateSettings(userId: string, input: SettingsInput): void {
  const current = requireOwnedUser(userId);
  const smtpPass = input.smtpPass === null ? current.smtp_pass : encryptSecret(input.smtpPass);
  getDb()
    .prepare(
      `UPDATE users SET name = ?, company_name = ?, postal_address = ?, from_name = ?, from_email = ?, reply_to = ?,
        smtp_host = ?, smtp_port = ?, smtp_secure = ?, smtp_user = ?, smtp_pass = ? WHERE id = ?`,
    )
    .run(
      input.name.trim().slice(0, 80),
      input.companyName.trim().slice(0, 120),
      input.postalAddress.trim().slice(0, 500),
      input.fromName.trim().slice(0, 80),
      normalizeEmail(input.fromEmail),
      input.replyTo.trim() ? normalizeEmail(input.replyTo) : "",
      input.smtpHost.trim().slice(0, 200),
      input.smtpPort,
      input.smtpSecure ? 1 : 0,
      input.smtpUser.trim().slice(0, 200),
      smtpPass,
      userId,
    );
}

export function getAccount(userId: string): Account {
  return toAccount(requireOwnedUser(userId));
}

export function campaignIsSending(campaignId: string): boolean {
  const row = getDb().prepare("SELECT status FROM campaigns WHERE id = ?").get(campaignId) as
    | { status: string }
    | undefined;
  return row?.status === "sending";
}

export function smtpCredentials(userId: string): {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
} {
  const row = requireOwnedUser(userId);
  let pass = "";
  try {
    pass = decryptSecret(row.smtp_pass);
  } catch {
    throw new UserError("The saved SMTP password could not be read. Enter it again in Settings.");
  }
  return {
    host: row.smtp_host.trim(),
    port: row.smtp_port,
    secure: row.smtp_secure === 1,
    user: row.smtp_user,
    pass,
  };
}

export function deleteAccount(userId: string): void {
  getDb().prepare("DELETE FROM users WHERE id = ?").run(userId);
}

export function dashboard(userId: string): Dashboard {
  const db = getDb();
  const contacts = db
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'subscribed' THEN 1 ELSE 0 END) AS subscribed,
         SUM(CASE WHEN status = 'unsubscribed' THEN 1 ELSE 0 END) AS unsubscribed
       FROM contacts WHERE user_id = ?`,
    )
    .get(userId) as { subscribed: number | null; unsubscribed: number | null };
  const lists = db.prepare("SELECT COUNT(*) AS n FROM lists WHERE user_id = ?").get(userId) as { n: number };
  const campaigns = db
    .prepare("SELECT COUNT(*) AS n FROM campaigns WHERE user_id = ? AND status = 'sent'")
    .get(userId) as { n: number };
  const mail = db
    .prepare(
      `SELECT
         SUM(CASE WHEN r.status = 'sent' THEN 1 ELSE 0 END) AS sent,
         SUM(CASE WHEN r.opened_at IS NOT NULL THEN 1 ELSE 0 END) AS opens,
         SUM(CASE WHEN r.clicked_at IS NOT NULL THEN 1 ELSE 0 END) AS clicks
       FROM recipients r JOIN campaigns c ON c.id = r.campaign_id
       WHERE c.user_id = ?`,
    )
    .get(userId) as { sent: number | null; opens: number | null; clicks: number | null };
  return {
    subscribed: Number(contacts.subscribed ?? 0),
    unsubscribed: Number(contacts.unsubscribed ?? 0),
    lists: Number(lists.n),
    sentCampaigns: Number(campaigns.n),
    sentRecipients: Number(mail.sent ?? 0),
    uniqueOpens: Number(mail.opens ?? 0),
    uniqueClicks: Number(mail.clicks ?? 0),
  };
}

export function recentCampaigns(userId: string): Campaign[] {
  return getDb()
    .prepare(
      `SELECT c.id, c.name, c.subject, c.html, c.list_id, l.name AS list_name, c.from_name, c.from_email, c.reply_to,
              c.status, c.created_at, c.updated_at, c.started_at, c.finished_at
       FROM campaigns c LEFT JOIN lists l ON l.id = c.list_id
       WHERE c.user_id = ? ORDER BY c.updated_at DESC LIMIT 6`,
    )
    .all(userId)
    .map((row) => mapCampaign(row as Record<string, unknown>));
}

export function listLists(userId: string): ContactList[] {
  return getDb()
    .prepare(
      `SELECT l.id, l.name, l.created_at,
              COUNT(lc.contact_id) AS contact_count,
              SUM(CASE WHEN c.status = 'subscribed' THEN 1 ELSE 0 END) AS subscribed_count
       FROM lists l
       LEFT JOIN list_contacts lc ON lc.list_id = l.id
       LEFT JOIN contacts c ON c.id = lc.contact_id
       WHERE l.user_id = ?
       GROUP BY l.id
       ORDER BY l.created_at DESC`,
    )
    .all(userId)
    .map((row) => {
      const item = row as {
        id: string;
        name: string;
        created_at: string;
        contact_count: number;
        subscribed_count: number | null;
      };
      return {
        id: item.id,
        name: item.name,
        createdAt: item.created_at,
        contactCount: Number(item.contact_count),
        subscribedCount: Number(item.subscribed_count ?? 0),
      };
    });
}

export function createList(userId: string, name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 80) throw new UserError("Give the list a name.");
  const id = newId();
  getDb().prepare("INSERT INTO lists (id, user_id, name, created_at) VALUES (?, ?, ?, ?)").run(id, userId, trimmed, nowIso());
  return id;
}

export function renameList(userId: string, listId: string, name: string): void {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 80) throw new UserError("Give the list a name.");
  const result = getDb().prepare("UPDATE lists SET name = ? WHERE id = ? AND user_id = ?").run(trimmed, listId, userId);
  if (changesOf(result) === 0) throw new UserError("List not found.");
}

export function getList(userId: string, listId: string): ContactList | null {
  return listLists(userId).find((list) => list.id === listId) ?? null;
}

export function deleteList(userId: string, listId: string): void {
  getDb().prepare("DELETE FROM lists WHERE id = ? AND user_id = ?").run(listId, userId);
}

function pageOf<T>(sql: string, countSql: string, params: SQLInputValue[], page: number): Page<T> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const total = Number((getDb().prepare(countSql).get(...params) as { n: number }).n);
  const rows = getDb()
    .prepare(`${sql} LIMIT ? OFFSET ?`)
    .all(...params, PAGE_SIZE, (safePage - 1) * PAGE_SIZE) as T[];
  return { rows, total, page: safePage, pageSize: PAGE_SIZE };
}

function mapContact(row: {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  created_at: string;
  list_names: string | null;
}): Contact {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    status: row.status,
    createdAt: row.created_at,
    listNames: row.list_names ?? "",
  };
}

export function listContacts(userId: string, page: number, query: string): Page<Contact> {
  const like = `%${query.trim().replace(/[%_]/g, "")}%`;
  const where = `FROM contacts c WHERE c.user_id = ? AND (? = '%%' OR c.email LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ?)`;
  const params = [userId, like, like, like, like];
  const result = pageOf<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    status: string;
    created_at: string;
    list_names: string | null;
  }>(
    `SELECT c.id, c.email, c.first_name, c.last_name, c.status, c.created_at,
            (SELECT GROUP_CONCAT(l.name, ', ') FROM list_contacts lc JOIN lists l ON l.id = lc.list_id WHERE lc.contact_id = c.id) AS list_names
     ${where} ORDER BY c.created_at DESC`,
    `SELECT COUNT(*) AS n ${where}`,
    params,
    page,
  );
  return { ...result, rows: result.rows.map(mapContact) };
}

export function listMembers(userId: string, listId: string, page: number, query: string): Page<Contact> | null {
  if (!getList(userId, listId)) return null;
  const like = `%${query.trim().replace(/[%_]/g, "")}%`;
  const where = `FROM contacts c
    JOIN list_contacts lc ON lc.contact_id = c.id AND lc.list_id = ?
    WHERE c.user_id = ? AND (? = '%%' OR c.email LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ?)`;
  const params = [listId, userId, like, like, like, like];
  const result = pageOf<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    status: string;
    created_at: string;
    list_names: string | null;
  }>(
    `SELECT c.id, c.email, c.first_name, c.last_name, c.status, c.created_at, '' AS list_names
     ${where} ORDER BY c.email`,
    `SELECT COUNT(*) AS n ${where}`,
    params,
    page,
  );
  return { ...result, rows: result.rows.map(mapContact) };
}

export function addContact(
  userId: string,
  input: { email: string; firstName: string; lastName: string; listId?: string | null },
): { created: boolean; status: string } {
  const email = normalizeEmail(input.email);
  if (!isEmail(email)) throw new UserError("Enter a valid email.");
  if (input.listId && !getList(userId, input.listId)) throw new UserError("List not found.");
  const db = getDb();
  const existing = db
    .prepare("SELECT id, status FROM contacts WHERE user_id = ? AND email = ?")
    .get(userId, email) as { id: string; status: string } | undefined;
  const now = nowIso();
  let id = existing?.id;
  let created = false;
  if (!existing) {
    id = newId();
    created = true;
    db.prepare(
      `INSERT INTO contacts (id, user_id, email, first_name, last_name, status, unsub_token, created_at)
       VALUES (?, ?, ?, ?, ?, 'subscribed', ?, ?)`,
    ).run(id, userId, email, input.firstName.trim().slice(0, 80), input.lastName.trim().slice(0, 80), newToken(), now);
  } else {
    db.prepare(
      `UPDATE contacts SET
         first_name = CASE WHEN ? != '' THEN ? ELSE first_name END,
         last_name = CASE WHEN ? != '' THEN ? ELSE last_name END
       WHERE id = ?`,
    ).run(
      input.firstName.trim(),
      input.firstName.trim().slice(0, 80),
      input.lastName.trim(),
      input.lastName.trim().slice(0, 80),
      existing.id,
    );
  }
  if (input.listId && id) {
    db.prepare("INSERT OR IGNORE INTO list_contacts (list_id, contact_id, created_at) VALUES (?, ?, ?)").run(
      input.listId,
      id,
      now,
    );
  }
  const status = existing?.status ?? "subscribed";
  return { created, status };
}

export function setContactStatus(userId: string, contactId: string, status: "subscribed" | "unsubscribed"): void {
  const result = getDb()
    .prepare("UPDATE contacts SET status = ? WHERE id = ? AND user_id = ?")
    .run(status, contactId, userId);
  if (changesOf(result) === 0) throw new UserError("Contact not found.");
}

export function deleteContact(userId: string, contactId: string): void {
  const db = getDb();
  const row = db
    .prepare("SELECT id, email, unsub_token FROM contacts WHERE id = ? AND user_id = ?")
    .get(contactId, userId) as { id: string; email: string; unsub_token: string } | undefined;
  if (!row) throw new UserError("Contact not found.");
  const now = nowIso();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      "INSERT OR REPLACE INTO suppressions (token, user_id, email, created_at) VALUES (?, ?, ?, ?)",
    ).run(row.unsub_token, userId, row.email, now);
    db.prepare(
      `UPDATE recipients SET status = 'skipped', error = 'Contact removed', claimed_at = NULL
       WHERE contact_id = ? AND status IN ('pending', 'sending')`,
    ).run(row.id);
    db.prepare("DELETE FROM contacts WHERE id = ?").run(row.id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function removeFromList(userId: string, listId: string, contactId: string): void {
  if (!getList(userId, listId)) throw new UserError("List not found.");
  getDb().prepare("DELETE FROM list_contacts WHERE list_id = ? AND contact_id = ?").run(listId, contactId);
}

export function importContacts(userId: string, listId: string | null, csv: string): ImportResult {
  if (listId && !getList(userId, listId)) throw new UserError("List not found.");
  const parsed = readContactCsv(csv);
  const db = getDb();
  const now = nowIso();
  let created = 0;
  let updated = 0;
  let addedToList = 0;
  let keptUnsubscribed = 0;
  const find = db.prepare("SELECT id, status FROM contacts WHERE user_id = ? AND email = ?");
  const insert = db.prepare(
    `INSERT INTO contacts (id, user_id, email, first_name, last_name, status, unsub_token, created_at)
     VALUES (?, ?, ?, ?, ?, 'subscribed', ?, ?)`,
  );
  const update = db.prepare(
    `UPDATE contacts SET
       first_name = CASE WHEN ? != '' THEN ? ELSE first_name END,
       last_name = CASE WHEN ? != '' THEN ? ELSE last_name END
     WHERE id = ?`,
  );
  const link = db.prepare(
    "INSERT OR IGNORE INTO list_contacts (list_id, contact_id, created_at) VALUES (?, ?, ?)",
  );
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const contact of parsed.contacts) {
      const existing = find.get(userId, contact.email) as { id: string; status: string } | undefined;
      let id: string;
      if (!existing) {
        id = newId();
        insert.run(id, userId, contact.email, contact.firstName, contact.lastName, newToken(), now);
        created += 1;
      } else {
        id = existing.id;
        update.run(contact.firstName, contact.firstName, contact.lastName, contact.lastName, id);
        updated += 1;
        if (existing.status === "unsubscribed") keptUnsubscribed += 1;
      }
      if (listId) {
        const linked = link.run(listId, id, now);
        addedToList += changesOf(linked);
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return {
    created,
    updated,
    addedToList,
    invalid: parsed.invalid,
    keptUnsubscribed,
  };
}

export function contactsCsv(userId: string, listId: string | null): string | null {
  if (listId && !getList(userId, listId)) return null;
  const rows = (
    listId
      ? getDb()
          .prepare(
            `SELECT c.email, c.first_name, c.last_name, c.status
             FROM contacts c JOIN list_contacts lc ON lc.contact_id = c.id
             WHERE lc.list_id = ? AND c.user_id = ? ORDER BY c.email`,
          )
          .all(listId, userId)
      : getDb()
          .prepare(
            "SELECT email, first_name, last_name, status FROM contacts WHERE user_id = ? ORDER BY email",
          )
          .all(userId)
  ) as { email: string; first_name: string; last_name: string; status: string }[];
  return toCsv([
    ["email", "first_name", "last_name", "status"],
    ...rows.map((row) => [row.email, row.first_name, row.last_name, row.status]),
  ]);
}

export function listTemplates(userId: string): Template[] {
  return getDb()
    .prepare(
      "SELECT id, name, subject, html, created_at, updated_at FROM templates WHERE user_id = ? ORDER BY updated_at DESC",
    )
    .all(userId)
    .map((row) => mapTemplate(row as Record<string, unknown>));
}

export function getTemplate(userId: string, id: string): Template | null {
  const row = getDb()
    .prepare(
      "SELECT id, name, subject, html, created_at, updated_at FROM templates WHERE id = ? AND user_id = ?",
    )
    .get(id, userId);
  return row ? mapTemplate(row as Record<string, unknown>) : null;
}

function mapTemplate(row: Record<string, unknown>): Template {
  return {
    id: String(row.id),
    name: String(row.name),
    subject: String(row.subject),
    html: String(row.html),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function saveTemplate(
  userId: string,
  input: { id?: string; name: string; subject: string; html: string },
): string {
  const name = input.name.trim();
  const subject = input.subject.trim();
  const html = input.html.trim();
  if (!name || name.length > 80) throw new UserError("Give the template a name.");
  if (!subject || subject.length > 180) throw new UserError("Add a subject under 180 characters.");
  if (!html || html.length > 300_000) throw new UserError("Add the template body.");
  const now = nowIso();
  if (input.id) {
    const result = getDb()
      .prepare("UPDATE templates SET name = ?, subject = ?, html = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .run(name, subject, html, now, input.id, userId);
    if (changesOf(result) === 0) throw new UserError("Template not found.");
    return input.id;
  }
  const id = newId();
  getDb()
    .prepare(
      "INSERT INTO templates (id, user_id, name, subject, html, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(id, userId, name, subject, html, now, now);
  return id;
}

export function deleteTemplate(userId: string, id: string): void {
  getDb().prepare("DELETE FROM templates WHERE id = ? AND user_id = ?").run(id, userId);
}

function mapCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: String(row.id),
    name: String(row.name),
    subject: String(row.subject),
    html: String(row.html),
    listId: row.list_id == null ? null : String(row.list_id),
    listName: row.list_name == null ? null : String(row.list_name),
    fromName: String(row.from_name ?? ""),
    fromEmail: String(row.from_email ?? ""),
    replyTo: String(row.reply_to ?? ""),
    status: String(row.status) as Campaign["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    startedAt: row.started_at == null ? null : String(row.started_at),
    finishedAt: row.finished_at == null ? null : String(row.finished_at),
  };
}

const CAMPAIGN_SELECT = `SELECT c.id, c.name, c.subject, c.html, c.list_id, l.name AS list_name, c.from_name, c.from_email,
  c.reply_to, c.status, c.created_at, c.updated_at, c.started_at, c.finished_at
  FROM campaigns c LEFT JOIN lists l ON l.id = c.list_id`;

export function listCampaigns(userId: string): Campaign[] {
  return getDb()
    .prepare(`${CAMPAIGN_SELECT} WHERE c.user_id = ? ORDER BY c.updated_at DESC`)
    .all(userId)
    .map((row) => mapCampaign(row as Record<string, unknown>));
}

export function getCampaign(userId: string, id: string): Campaign | null {
  const row = getDb().prepare(`${CAMPAIGN_SELECT} WHERE c.id = ? AND c.user_id = ?`).get(id, userId);
  return row ? mapCampaign(row as Parameters<typeof mapCampaign>[0]) : null;
}

export function saveCampaign(
  userId: string,
  input: {
    id?: string;
    name: string;
    subject: string;
    html: string;
    listId: string | null;
    fromName: string;
    fromEmail: string;
    replyTo: string;
  },
): string {
  const name = input.name.trim() || "Untitled campaign";
  if (name.length > 120) throw new UserError("Campaign name is too long.");
  if (input.subject.trim().length > 180) throw new UserError("Subject is too long.");
  if (input.html.length > 300_000) throw new UserError("The email body is too long.");
  const account = toAccount(requireOwnedUser(userId));
  const fromEmail = normalizeEmail(input.fromEmail || account.fromEmail || account.email);
  if (fromEmail && !isEmail(fromEmail)) throw new UserError("From email is not valid.");
  const replyTo = input.replyTo.trim() ? normalizeEmail(input.replyTo) : "";
  if (replyTo && !isEmail(replyTo)) throw new UserError("Reply-to email is not valid.");
  if (input.listId && !getList(userId, input.listId)) throw new UserError("List not found.");
  const now = nowIso();
  if (!input.id) {
    const id = newId();
    getDb()
      .prepare(
        `INSERT INTO campaigns (id, user_id, list_id, name, subject, html, from_name, from_email, reply_to, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      )
      .run(
        id,
        userId,
        input.listId,
        name,
        input.subject.trim(),
        input.html,
        (input.fromName || account.fromName).trim(),
        fromEmail,
        replyTo,
        now,
        now,
      );
    return id;
  }
  const result = getDb()
    .prepare(
      `UPDATE campaigns SET list_id = ?, name = ?, subject = ?, html = ?, from_name = ?, from_email = ?, reply_to = ?, updated_at = ?
       WHERE id = ? AND user_id = ? AND status = 'draft'`,
    )
    .run(
      input.listId,
      name,
      input.subject.trim(),
      input.html,
      input.fromName.trim(),
      fromEmail,
      replyTo,
      now,
      input.id,
      userId,
    );
  if (changesOf(result) === 0) throw new UserError("Only drafts can be edited.");
  return input.id;
}

export function duplicateCampaign(userId: string, campaignId: string): string {
  const campaign = getCampaign(userId, campaignId);
  if (!campaign) throw new UserError("Campaign not found.");
  return saveCampaign(userId, {
    name: `${campaign.name} copy`.slice(0, 120),
    subject: campaign.subject,
    html: campaign.html,
    listId: campaign.listId,
    fromName: campaign.fromName,
    fromEmail: campaign.fromEmail,
    replyTo: campaign.replyTo,
  });
}

export function deleteCampaign(userId: string, campaignId: string): void {
  getDb().prepare("DELETE FROM campaigns WHERE id = ? AND user_id = ?").run(campaignId, userId);
}

export function subscribedCount(userId: string, listId: string | null): number {
  if (!listId) return 0;
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM list_contacts lc
       JOIN contacts c ON c.id = lc.contact_id
       JOIN lists l ON l.id = lc.list_id
       WHERE lc.list_id = ? AND l.user_id = ? AND c.status = 'subscribed'`,
    )
    .get(listId, userId) as { n: number };
  return Number(row.n);
}

export function queueCampaign(userId: string, campaignId: string, origin: string): { queued: number } {
  const campaign = getCampaign(userId, campaignId);
  if (!campaign) throw new UserError("Campaign not found.");
  if (campaign.status !== "draft") throw new UserError("This campaign has already been queued.");
  const account = toAccount(requireOwnedUser(userId));
  const subscribed = subscribedCount(userId, campaign.listId);
  const blockers = sendBlockers({
    subject: campaign.subject,
    html: campaign.html,
    listId: campaign.listId,
    fromEmail: campaign.fromEmail,
    companyName: account.companyName,
    postalAddress: account.postalAddress,
    subscribed,
    smtpConfigured: account.smtpConfigured,
  });
  if (blockers.length) throw new UserError(blockers[0]);
  if (!campaign.listId) throw new UserError("Choose a list.");
  const listId = campaign.listId;
  const db = getDb();
  const people = db
    .prepare(
      `SELECT c.id, c.email, c.first_name, c.last_name, c.unsub_token
       FROM contacts c
       JOIN list_contacts lc ON lc.contact_id = c.id
       WHERE lc.list_id = ? AND c.user_id = ? AND c.status = 'subscribed'`,
    )
    .all(listId, userId) as {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    unsub_token: string;
  }[];
  if (people.length === 0) throw new UserError("This list has no subscribed contacts.");
  const now = nowIso();
  const insert = db.prepare(
    `INSERT INTO recipients (id, campaign_id, contact_id, email, first_name, last_name, unsub_token, token, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
  );
  db.exec("BEGIN IMMEDIATE");
  try {
    const locked = db
      .prepare("UPDATE campaigns SET status = 'sending', origin = ?, started_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND status = 'draft'")
      .run(origin.replace(/\/$/, ""), now, now, campaignId, userId);
    if (changesOf(locked) === 0) throw new UserError("This campaign has already been queued.");
    for (const person of people) {
      insert.run(newId(), campaignId, person.id, person.email, person.first_name, person.last_name, person.unsub_token, newToken(), now);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { queued: people.length };
}

export function setCampaignStatus(userId: string, campaignId: string, status: "paused" | "sending"): void {
  const expected = status === "paused" ? "sending" : "paused";
  const result = getDb()
    .prepare("UPDATE campaigns SET status = ?, updated_at = ? WHERE id = ? AND user_id = ? AND status = ?")
    .run(status, nowIso(), campaignId, userId, expected);
  if (changesOf(result) === 0) throw new UserError("That campaign cannot be updated.");
}

export function campaignStats(campaignId: string): CampaignStats {
  const row = getDb()
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
         SUM(CASE WHEN status IN ('pending', 'sending') THEN 1 ELSE 0 END) AS waiting,
         SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) AS skipped,
         SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) AS unique_opens,
         SUM(open_count) AS opens,
         SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) AS unique_clicks,
         SUM(click_count) AS clicks
       FROM recipients WHERE campaign_id = ?`,
    )
    .get(campaignId) as Record<string, number | null>;
  const unsubs = getDb()
    .prepare("SELECT COUNT(*) AS n FROM events WHERE campaign_id = ? AND type = 'unsubscribe'")
    .get(campaignId) as { n: number };
  return {
    total: Number(row.total ?? 0),
    sent: Number(row.sent ?? 0),
    failed: Number(row.failed ?? 0),
    waiting: Number(row.waiting ?? 0),
    skipped: Number(row.skipped ?? 0),
    uniqueOpens: Number(row.unique_opens ?? 0),
    opens: Number(row.opens ?? 0),
    uniqueClicks: Number(row.unique_clicks ?? 0),
    clicks: Number(row.clicks ?? 0),
    unsubscribes: Number(unsubs.n),
  };
}

export function clickStats(campaignId: string): ClickStat[] {
  return getDb()
    .prepare(
      `SELECT url, COUNT(*) AS hits FROM events WHERE campaign_id = ? AND type = 'click' AND url != ''
       GROUP BY url ORDER BY hits DESC LIMIT 20`,
    )
    .all(campaignId)
    .map((row) => {
      const item = row as { url: string; hits: number };
      return { url: item.url, hits: Number(item.hits) };
    });
}

export function failureRows(campaignId: string): FailureRow[] {
  return getDb()
    .prepare(
      "SELECT email, error FROM recipients WHERE campaign_id = ? AND status = 'failed' ORDER BY email LIMIT 50",
    )
    .all(campaignId) as FailureRow[];
}

export function recentDeliveries(campaignId: string): { id: string; email: string; createdAt: string }[] {
  return getDb()
    .prepare(
      `SELECT d.id, d.to_email AS email, d.created_at
       FROM deliveries d JOIN recipients r ON r.id = d.recipient_id
       WHERE r.campaign_id = ? ORDER BY d.created_at DESC LIMIT 20`,
    )
    .all(campaignId)
    .map((row) => {
      const item = row as { id: string; email: string; created_at: string };
      return { id: item.id, email: item.email, createdAt: item.created_at };
    });
}

export function getDelivery(userId: string, deliveryId: string): DeliveryView | null {
  const row = getDb()
    .prepare(
      `SELECT d.id, d.recipient_id, d.to_email, d.subject, d.html, d.mode, d.created_at, r.token, r.status
       FROM deliveries d
       JOIN recipients r ON r.id = d.recipient_id
       JOIN campaigns c ON c.id = r.campaign_id
       WHERE d.id = ? AND c.user_id = ?`,
    )
    .get(deliveryId, userId) as
    | {
        id: string;
        recipient_id: string;
        to_email: string;
        subject: string;
        html: string;
        mode: string;
        created_at: string;
        token: string;
        status: string;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    recipientId: row.recipient_id,
    email: row.to_email,
    subject: row.subject,
    html: row.html,
    mode: row.mode,
    token: row.token,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function releaseStaleClaims(): void {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  getDb()
    .prepare(
      `UPDATE recipients SET status = 'pending', claimed_at = NULL
       WHERE status = 'sending' AND claimed_at IS NOT NULL AND claimed_at < ?`,
    )
    .run(cutoff);
}

export function claimBatch(limit: number): SendJob[] {
  const db = getDb();
  const claimed: string[] = [];
  db.exec("BEGIN IMMEDIATE");
  try {
    const ids = db
      .prepare(
        `SELECT r.id FROM recipients r
         JOIN campaigns c ON c.id = r.campaign_id
         WHERE r.status = 'pending' AND c.status = 'sending'
         ORDER BY r.created_at LIMIT ?`,
      )
      .all(limit) as { id: string }[];
    const claim = db.prepare(
      "UPDATE recipients SET status = 'sending', claimed_at = ? WHERE id = ? AND status = 'pending'",
    );
    const now = nowIso();
    for (const row of ids) {
      if (changesOf(claim.run(now, row.id)) === 1) claimed.push(row.id);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  if (claimed.length === 0) return [];
  const placeholders = claimed.map(() => "?").join(", ");
  return db
    .prepare(
      `SELECT r.id AS recipient_id, r.campaign_id, r.contact_id, contacts.status AS contact_status, r.email,
              r.first_name, r.last_name, r.unsub_token, r.token, c.subject, c.html, c.from_name, c.from_email,
              c.reply_to, c.origin, c.user_id, c.status AS campaign_status
       FROM recipients r
       JOIN campaigns c ON c.id = r.campaign_id
       LEFT JOIN contacts ON contacts.id = r.contact_id
       WHERE r.id IN (${placeholders})`,
    )
    .all(...claimed)
    .map((row) => {
      const item = row as Record<string, string | null>;
      return {
        recipientId: String(item.recipient_id),
        campaignId: String(item.campaign_id),
        contactId: item.contact_id,
        contactStatus: item.contact_status,
        email: String(item.email),
        firstName: String(item.first_name ?? ""),
        lastName: String(item.last_name ?? ""),
        unsubToken: String(item.unsub_token),
        token: String(item.token),
        subject: String(item.subject),
        html: String(item.html),
        fromName: String(item.from_name ?? ""),
        fromEmail: String(item.from_email ?? ""),
        replyTo: String(item.reply_to ?? ""),
        origin: String(item.origin ?? ""),
        userId: String(item.user_id),
        campaignStatus: String(item.campaign_status),
      };
    });
}

export function markRecipient(id: string, status: "sent" | "failed" | "skipped" | "pending", error: string): void {
  const sentAt = status === "sent" ? nowIso() : null;
  getDb()
    .prepare("UPDATE recipients SET status = ?, error = ?, sent_at = ?, claimed_at = NULL WHERE id = ?")
    .run(status, error.slice(0, 500), sentAt, id);
}

export function saveDelivery(input: {
  recipientId: string;
  mode: "smtp" | "capture";
  to: string;
  subject: string;
  html: string;
}): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO deliveries (id, recipient_id, mode, to_email, subject, html, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(newId(), input.recipientId, input.mode, input.to, input.subject, input.html, nowIso());
}

export function finishCampaigns(): void {
  getDb()
    .prepare(
      `UPDATE campaigns SET status = 'sent', finished_at = ?, updated_at = ?
       WHERE status = 'sending'
       AND NOT EXISTS (
         SELECT 1 FROM recipients r WHERE r.campaign_id = campaigns.id AND r.status IN ('pending', 'sending')
       )`,
    )
    .run(nowIso(), nowIso());
}

export function recordOpen(token: string): void {
  const row = getDb().prepare("SELECT id, campaign_id FROM recipients WHERE token = ?").get(token) as
    | { id: string; campaign_id: string }
    | undefined;
  if (!row) return;
  const now = nowIso();
  getDb()
    .prepare("UPDATE recipients SET open_count = open_count + 1, opened_at = COALESCE(opened_at, ?) WHERE id = ?")
    .run(now, row.id);
  getDb()
    .prepare("INSERT INTO events (id, campaign_id, recipient_id, type, url, created_at) VALUES (?, ?, ?, 'open', '', ?)")
    .run(newId(), row.campaign_id, row.id, now);
}

export function recordClick(token: string, url: string): void {
  const row = getDb().prepare("SELECT id, campaign_id FROM recipients WHERE token = ?").get(token) as
    | { id: string; campaign_id: string }
    | undefined;
  if (!row) return;
  const now = nowIso();
  getDb()
    .prepare("UPDATE recipients SET click_count = click_count + 1, clicked_at = COALESCE(clicked_at, ?) WHERE id = ?")
    .run(now, row.id);
  getDb()
    .prepare("INSERT INTO events (id, campaign_id, recipient_id, type, url, created_at) VALUES (?, ?, ?, 'click', ?, ?)")
    .run(newId(), row.campaign_id, row.id, url.slice(0, 2000), now);
}

export type UnsubView = {
  email: string;
  companyName: string;
  status: string;
};

export function unsubView(token: string): UnsubView | null {
  const contact = getDb()
    .prepare(
      `SELECT c.email, c.status, u.company_name
       FROM contacts c JOIN users u ON u.id = c.user_id WHERE c.unsub_token = ?`,
    )
    .get(token) as { email: string; status: string; company_name: string } | undefined;
  if (contact) {
    return { email: contact.email, companyName: contact.company_name, status: contact.status };
  }
  const suppressed = getDb()
    .prepare(
      `SELECT s.email, u.company_name FROM suppressions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    )
    .get(token) as { email: string; company_name: string } | undefined;
  if (!suppressed) return null;
  return { email: suppressed.email, companyName: suppressed.company_name, status: "unsubscribed" };
}

export function unsubscribe(token: string, campaignId: string | null): UnsubView | null {
  const current = unsubView(token);
  if (!current) return null;
  const db = getDb();
  const result = db
    .prepare("UPDATE contacts SET status = 'unsubscribed' WHERE unsub_token = ? AND status != 'unsubscribed'")
    .run(token);
  if (changesOf(result) > 0 && campaignId) {
    const recipient = db
      .prepare(
        `SELECT r.id FROM recipients r
         JOIN contacts c ON c.id = r.contact_id
         WHERE c.unsub_token = ? AND r.campaign_id = ?`,
      )
      .get(token, campaignId) as { id: string } | undefined;
    if (recipient) {
      db.prepare(
        "INSERT INTO events (id, campaign_id, recipient_id, type, url, created_at) VALUES (?, ?, ?, 'unsubscribe', '', ?)",
      ).run(newId(), campaignId, recipient.id, nowIso());
    }
  }
  return { ...current, status: "unsubscribed" };
}
