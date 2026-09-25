"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSession, createUser, deleteAccount, deleteSession, verifyPassword } from "../queries";
import { SESSION_COOKIE, setSessionCookie } from "../session";
import { UserError } from "../user-error";
import { normalizeEmail, safeNext, withMessage } from "../validators";

const attempts = new Map<string, { count: number; reset: number }>();

function tooMany(email: string): boolean {
  const now = Date.now();
  const key = normalizeEmail(email);
  const row = attempts.get(key);
  if (!row || row.reset < now) {
    attempts.set(key, { count: 1, reset: now + 15 * 60 * 1000 });
    return false;
  }
  row.count += 1;
  return row.count > 8;
}

export async function signupAction(formData: FormData): Promise<void> {
  const next = safeNext(String(formData.get("next") || "/app"));
  try {
    const user = await createUser({
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
    });
    await setSessionCookie(await createSession(user.id));
  } catch (error) {
    if (error instanceof UserError) redirect(withMessage("/signup", "error", error.message));
    throw error;
  }
  redirect(next);
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") || "");
  const next = safeNext(String(formData.get("next") || "/app"));
  if (tooMany(email)) {
    redirect(withMessage("/login", "error", "Too many sign-in attempts. Wait a few minutes and try again."));
  }
  const user = await verifyPassword(email, String(formData.get("password") || ""));
  if (!user) redirect(withMessage(`/login?next=${encodeURIComponent(next)}`, "error", "Email or password is wrong."));
  attempts.delete(normalizeEmail(email));
  await setSessionCookie(await createSession(user.id));
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) await deleteSession(id);
  jar.delete(SESSION_COOKIE);
  redirect("/");
}

export async function deleteAccountAction(): Promise<void> {
  const { requireUser } = await import("../session");
  const user = await requireUser();
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  await deleteAccount(user.id);
  if (id) await deleteSession(id);
  jar.delete(SESSION_COOKIE);
  redirect("/");
}
