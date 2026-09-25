# Postroom

Postroom is a small campaign email app. It keeps your lists, templates, and the record of opens and clicks. Your own SMTP server delivers the mail.

Until SMTP is configured, Postroom runs in capture mode: each letter is stored on the campaign so you can click through tracking and unsubscribe without sending anything.

## What it does

- Accounts, contact lists, and CSV import
- Templates with merge tags
- Campaign drafts, a review step, and a background send worker
- Open tracking, signed click tracking, and one-click unsubscribe
- Company name and postal address on every letter

Automation, SMS, a drag-and-drop builder, and a shared sending IP are not part of this version.

## Run it

From PowerShell, if `npm` is blocked by the execution policy, call `npm.cmd` instead.

```bash
npm install
npm run dev
```

Open http://localhost:3010. `npm run dev` starts the site and the send worker together.

Create an account, add your company name and postal address in Settings, import a list, and send a campaign. With no SMTP host, open the stored message from the campaign page.

## SMTP

Save this in Settings. For Amazon SES it usually looks like:

- Host: `email-smtp.us-east-1.amazonaws.com`
- Port: `587`
- Secure: off (STARTTLS)
- Username and password: the SES SMTP credentials
- From email: an identity you have verified in SES

Port 465 normally needs Secure checked.

The from address can differ from the SMTP username. Many providers, including SES, authenticate with an access key and send from a verified identity.

## Environment

Copy `.env.example` to `.env.local` if you want to set these. Local use works without them.

- `APP_ORIGIN` — public URL written into tracking and unsubscribe links. Leave unset locally and Postroom uses the request host.
- `APP_SECRET` — encrypts SMTP passwords and signs click links. If unset, a secret is created in `data/app.secret`.
- `SEND_DELAY_MS` — pause between messages. Default 250.

The database file is `data/postroom.db`.

## Tests

```bash
npm test
```

## Your responsibility

Postroom refuses to queue a campaign until a company name and postal address are saved, and it adds an unsubscribe link plus a `List-Unsubscribe` header. You still need permission to email the list. Do not import addresses you are not allowed to contact.
