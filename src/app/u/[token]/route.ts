import { escapeHtml } from "@/lib/render";
import { unsubscribe, unsubView } from "@/lib/queries";

export const runtime = "nodejs";

function page(input: { title: string; body: string; token?: string; campaign?: string | null; button?: string }): string {
  const action = input.campaign ? `?c=${encodeURIComponent(input.campaign)}` : "";
  const button = input.button
    ? `<form method="post" action="${action}"><button type="submit">${escapeHtml(input.button)}</button></form>`
    : "";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.title)}</title>
    <style>
      body { margin: 0; background: #f3ecdf; color: #231f1a; font-family: Georgia, serif; }
      main { width: min(520px, calc(100% - 32px)); margin: 8vh auto; background: #fffaf3; border: 1px solid #e0d5c4; border-radius: 18px; padding: 28px; }
      h1 { font-weight: 500; font-size: 2rem; margin: 0 0 12px; }
      p { font-family: "Segoe UI", sans-serif; line-height: 1.5; color: #4a433a; }
      button { background: #231f1a; color: #f3ecdf; border: 0; border-radius: 999px; padding: 12px 18px; font: 600 0.95rem "Segoe UI", sans-serif; cursor: pointer; }
      .stripe { height: 10px; background: repeating-linear-gradient(135deg, #d23b2a 0 12px, #f3ecdf 12px 22px, #231f1a 22px 28px, #f3ecdf 28px 40px); }
    </style></head><body><div class="stripe"></div><main><h1>${escapeHtml(input.title)}</h1>${input.body}${button}</main></body></html>`;
}

function html(body: string, status: number): Response {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const view = await unsubView(token);
  if (!view) return html(page({ title: "Link not valid", body: "<p>This unsubscribe link is not valid.</p>" }), 404);
  const campaign = new URL(request.url).searchParams.get("c");
  if (view.status === "unsubscribed") {
    return html(
      page({
        title: "You are unsubscribed",
        body: `<p>${escapeHtml(view.email)} will not receive future campaigns${view.companyName ? ` from ${escapeHtml(view.companyName)}` : ""}.</p>`,
      }),
      200,
    );
  }
  return html(
    page({
      title: "Unsubscribe",
      body: `<p>Stop campaign mail to ${escapeHtml(view.email)}${view.companyName ? ` from ${escapeHtml(view.companyName)}` : ""}.</p>`,
      campaign,
      button: "Unsubscribe",
    }),
    200,
  );
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const campaign = new URL(request.url).searchParams.get("c");
  const view = await unsubscribe(token, campaign);
  if (!view) return html(page({ title: "Link not valid", body: "<p>This unsubscribe link is not valid.</p>" }), 404);
  return html(
    page({
      title: "You are unsubscribed",
      body: `<p>${escapeHtml(view.email)} will not receive future campaigns${view.companyName ? ` from ${escapeHtml(view.companyName)}` : ""}.</p>`,
    }),
    200,
  );
}
