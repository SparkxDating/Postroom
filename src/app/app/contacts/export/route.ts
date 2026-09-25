import { NextResponse } from "next/server";
import { contactsCsv } from "@/lib/queries";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const listId = new URL(request.url).searchParams.get("list");
  const csv = await contactsCsv(user.id, listId);
  if (csv === null) return new Response("List not found.", { status: 404 });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=contacts.csv",
    },
  });
}
