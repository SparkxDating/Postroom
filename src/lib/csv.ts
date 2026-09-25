import { UserError } from "./user-error";
import { isEmail, normalizeEmail } from "./validators";

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

const HEADER_MAP: Record<string, "email" | "firstName" | "lastName"> = {
  email: "email",
  "e-mail": "email",
  "email address": "email",
  "first name": "firstName",
  firstname: "firstName",
  first_name: "firstName",
  "given name": "firstName",
  "last name": "lastName",
  lastname: "lastName",
  last_name: "lastName",
  surname: "lastName",
};

export type CsvContact = {
  email: string;
  firstName: string;
  lastName: string;
  line: number;
};

export function readContactCsv(text: string): { contacts: CsvContact[]; invalid: number } {
  const table = parseCsv(text);
  if (table.length === 0) throw new UserError("That CSV is empty.");
  const headers = table[0].map((header) => header.trim().toLowerCase());
  const emailIndex = headers.findIndex((header) => HEADER_MAP[header] === "email");
  if (emailIndex === -1) throw new UserError("The CSV needs a header row with an email column.");
  const firstIndex = headers.findIndex((header) => HEADER_MAP[header] === "firstName");
  const lastIndex = headers.findIndex((header) => HEADER_MAP[header] === "lastName");
  const byEmail = new Map<string, CsvContact>();
  let invalid = 0;
  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    const email = normalizeEmail(cells[emailIndex] || "");
    if (!isEmail(email)) {
      invalid += 1;
      continue;
    }
    byEmail.set(email, {
      email,
      firstName: (firstIndex >= 0 ? cells[firstIndex] || "" : "").trim().slice(0, 80),
      lastName: (lastIndex >= 0 ? cells[lastIndex] || "" : "").trim().slice(0, 80),
      line: i + 1,
    });
  }
  if (byEmail.size > 5000) throw new UserError("Import up to 5,000 contacts at a time.");
  return { contacts: [...byEmail.values()], invalid };
}

export function toCsv(rows: string[][]): string {
  return rows
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}
