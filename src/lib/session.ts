import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { accountForSession } from "./queries";
import type { Account } from "./types";

export const SESSION_COOKIE = "postroom_session";

export async function currentUser(): Promise<Account | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return accountForSession(id);
}

export async function requireUser(): Promise<Account> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) redirect("/login");
  const user = accountForSession(id);
  if (!user) redirect("/api/clear-session");
  return user;
}

export async function setSessionCookie(id: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
