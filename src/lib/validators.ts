const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isEmail(email: string): boolean {
  return email.length <= 320 && EMAIL.test(email);
}

export function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export type BlockerInput = {
  subject: string;
  html: string;
  listId: string | null;
  fromEmail: string;
  companyName: string;
  postalAddress: string;
  subscribed: number;
  smtpConfigured: boolean;
};

export function sendBlockers(input: BlockerInput): string[] {
  const blockers: string[] = [];
  if (!input.subject.trim()) blockers.push("Add a subject.");
  if (!input.html.trim()) blockers.push("Add the email body.");
  if (!input.listId) blockers.push("Choose a list.");
  if (!input.fromEmail.trim() || !isEmail(normalizeEmail(input.fromEmail))) {
    blockers.push("Add a valid from email.");
  }
  if (!input.companyName.trim()) blockers.push("Add your company name in Settings.");
  if (!input.postalAddress.trim()) blockers.push("Add your postal address in Settings.");
  if (input.subscribed < 1) blockers.push("This list has no subscribed contacts.");
  if (!input.smtpConfigured && input.subscribed > 200) {
    blockers.push("Connect SMTP before sending more than 200 people. Capture mode is only for trying the flow.");
  }
  return blockers;
}

export function withMessage(path: string, kind: "error" | "notice", message: string): string {
  const url = new URL(path, "http://postroom.local");
  url.searchParams.set(kind, message);
  return `${url.pathname}${url.search}`;
}

export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/app") || value.startsWith("//") || value.includes("\\")) {
    return "/app";
  }
  return value;
}
