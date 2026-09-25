import type { Metadata } from "next";
import { ConfirmSubmit, Flash, PageHeader, SubmitButton } from "@/components/ui";
import { deleteAccountAction } from "@/lib/actions/auth";
import { saveSettingsAction, testSmtpAction } from "@/lib/actions/settings";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <PageHeader
        title="Settings"
        lede="The postal address is printed on every campaign. SMTP is how the mail actually leaves."
      />
      <Flash error={params.error} notice={params.notice} />
      <form action={saveSettingsAction} className="stack">
        <label className="field">
          <span>Your name</span>
          <input name="name" defaultValue={user.name} required />
        </label>
        <label className="field">
          <span>Company name</span>
          <input name="companyName" defaultValue={user.companyName} />
        </label>
        <label className="field">
          <span>Postal address</span>
          <textarea name="postalAddress" defaultValue={user.postalAddress} style={{ minHeight: 110 }} placeholder={"1 Market Street\nAustin, TX 78701"} />
        </label>
        <div className="two">
          <label className="field">
            <span>Default from name</span>
            <input name="fromName" defaultValue={user.fromName} />
          </label>
          <label className="field">
            <span>Default from email</span>
            <input name="fromEmail" type="email" defaultValue={user.fromEmail} />
          </label>
        </div>
        <label className="field">
          <span>Reply-to</span>
          <input name="replyTo" type="email" defaultValue={user.replyTo} placeholder="Optional" />
        </label>
        <h2>SMTP</h2>
        <p className="fine">
          Port 587 usually leaves Secure unchecked, because the server upgrades with STARTTLS. Port 465 usually needs Secure
          checked. Leave the host empty to keep capture mode.
        </p>
        <div className="two">
          <label className="field">
            <span>Host</span>
            <input name="smtpHost" defaultValue={user.smtpHost} placeholder="email-smtp.us-east-1.amazonaws.com" />
          </label>
          <label className="field">
            <span>Port</span>
            <input name="smtpPort" type="number" defaultValue={user.smtpPort} min={1} max={65535} />
          </label>
        </div>
        <label className="check">
          <input type="checkbox" name="smtpSecure" value="1" defaultChecked={user.smtpSecure} />
          Secure (implicit TLS)
        </label>
        <label className="field">
          <span>Username</span>
          <input name="smtpUser" defaultValue={user.smtpUser} autoComplete="off" />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            name="smtpPass"
            type="password"
            autoComplete="new-password"
            placeholder={user.hasSmtpPassword ? "Saved. Leave blank to keep it." : "SMTP password"}
          />
        </label>
        <div className="action-row">
          <SubmitButton>Save settings</SubmitButton>
          <SubmitButton className="btn btn-ghost" pendingLabel="Testing…" formAction={testSmtpAction}>
            Test connection
          </SubmitButton>
        </div>
      </form>
      <form action={deleteAccountAction} className="danger-zone">
        <h2>Delete account</h2>
        <p className="fine">This removes your lists, contacts, templates, and campaigns from this Postroom database.</p>
        <ConfirmSubmit label="Delete account" message="Delete your Postroom account and all of its data?" className="btn btn-danger" />
      </form>
    </div>
  );
}
