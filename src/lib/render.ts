export type MergeFields = {
  firstName: string;
  lastName: string;
  email: string;
  unsubscribeUrl: string;
  companyName: string;
  postalAddress: string;
  unsubToken: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function applyMergeTags(input: string, fields: MergeFields, mode: "html" | "text"): string {
  const map: Record<string, string> = {
    first_name: fields.firstName || "there",
    last_name: fields.lastName,
    email: fields.email,
    unsubscribe_url: fields.unsubscribeUrl,
    company_name: fields.companyName,
    postal_address: fields.postalAddress,
  };
  return input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (whole, key: string) => {
    const value = map[key.toLowerCase()];
    if (value === undefined) return whole;
    if (mode === "text") return oneLine(value);
    if (key.toLowerCase() === "postal_address") {
      return escapeHtml(value).replace(/\n/g, "<br/>");
    }
    return escapeHtml(value);
  });
}

const FOOTER = `
<table data-postroom-footer role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px">
  <tr>
    <td style="padding:18px 8px 8px;font-family:Georgia,serif;font-size:12px;line-height:1.55;color:#746b60;border-top:1px solid #e0d5c4">
      {{company_name}}<br/>
      {{postal_address}}<br/>
      <a href="{{unsubscribe_url}}" style="color:#746b60">Unsubscribe</a>
    </td>
  </tr>
</table>`;

function insertBeforeBodyEnd(html: string, fragment: string): string {
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${fragment}</body>`);
  return html + fragment;
}

function ensureDocument(html: string): string {
  if (/<html[\s>]/i.test(html)) return html;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f3ecdf">${html}</body></html>`;
}

export function rewriteLinks(html: string, track: (url: string) => string, skip: (url: string) => boolean): string {
  return html.replace(/href\s*=\s*(["'])(https?:\/\/[^"']+)\1/gi, (match, quote: string, rawUrl: string) => {
    const url = decodeHtml(rawUrl);
    if (skip(url)) return match;
    return `href=${quote}${escapeHtml(track(url))}${quote}`;
  });
}

function pixelTag(url: string): string {
  return `<img src="${escapeHtml(url)}" width="1" height="1" alt="" style="display:block;border:0;outline:none;height:1px;width:1px"/>`;
}

export function composeEmail(input: {
  html: string;
  subject: string;
  fields: MergeFields;
  track: (url: string) => string;
  pixelUrl?: string;
}): { html: string; text: string; subject: string } {
  let html = input.html;
  if (!html.includes("data-postroom-footer")) html = insertBeforeBodyEnd(html, FOOTER);
  html = applyMergeTags(html, input.fields, "html");
  html = rewriteLinks(html, input.track, (url) => url.includes(`/u/${input.fields.unsubToken}`));
  html = ensureDocument(html);
  if (input.pixelUrl) html = insertBeforeBodyEnd(html, pixelTag(input.pixelUrl));
  return {
    html,
    text: htmlToText(html),
    subject: oneLine(applyMergeTags(input.subject, input.fields, "text")).slice(0, 180),
  };
}

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, label: string) => {
      const text = label.replace(/<[^>]+>/g, "").trim();
      return text ? `${text} (${decodeHtml(href)})` : decodeHtml(href);
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripOpenPixels(html: string): string {
  return html.replace(/<img\b[^>]*\/t\/o\/[^>]*>/gi, "");
}

export function formatAddress(name: string, email: string): string {
  const safeName = name.replace(/["\r\n]/g, "").trim();
  const safeEmail = email.replace(/[\r\n]/g, "").trim();
  if (!safeName) return safeEmail;
  return `"${safeName}" <${safeEmail}>`;
}
