import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/queries";
import { SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) deleteSession(id);
  jar.delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL("/login", request.url));
}
