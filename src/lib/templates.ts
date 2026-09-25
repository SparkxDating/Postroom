export type StarterTemplate = {
  name: string;
  subject: string;
  html: string;
};

const shell = (inner: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3ecdf;margin:0;padding:24px 12px">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fffaf3;border:1px solid #e0d5c4;border-radius:18px">
      <tr><td style="padding:32px 32px 28px;font-family:Georgia,'Times New Roman',serif;color:#231f1a">
        ${inner}
      </td></tr>
    </table>
  </td></tr>
</table>`;

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    name: "Announcement",
    subject: "A note from {{company_name}}",
    html: shell(`
      <p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#d23b2a">{{company_name}}</p>
      <h1 style="margin:0 0 14px;font-size:34px;line-height:1.12;font-weight:500">A note for you</h1>
      <p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#4a433a">Hi {{first_name}},</p>
      <p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#4a433a">Write the announcement here. One idea, a few short sentences, and a single next step.</p>
      <p style="margin:22px 0 0">
        <a href="https://example.com" style="background:#231f1a;color:#f3ecdf;text-decoration:none;padding:12px 18px;border-radius:999px;font-family:Arial,sans-serif;font-size:14px;display:inline-block">Read on</a>
      </p>
    `),
  },
  {
    name: "Newsletter",
    subject: "{{company_name}} — this week",
    html: shell(`
      <p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#d23b2a">{{company_name}}</p>
      <h1 style="margin:0 0 8px;font-size:34px;line-height:1.12;font-weight:500">This week</h1>
      <p style="margin:0 0 18px;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#4a433a">Hi {{first_name}}, here are two things worth your time.</p>
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:500">First story</h2>
      <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#4a433a">Replace this with the story. Link the one sentence you want people to click.</p>
      <p style="margin:0 0 20px"><a href="https://example.com" style="color:#a82d20;font-family:Arial,sans-serif">Open the story</a></p>
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:500">Second story</h2>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#4a433a">Keep the second item shorter than the first so the letter has a shape.</p>
    `),
  },
];
