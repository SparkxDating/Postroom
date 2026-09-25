import Link from "next/link";
import type { Metadata } from "next";
import { Pill } from "@/components/ui";
import { dashboard, recentCampaigns } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { percent } from "@/lib/time";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const user = await requireUser();
  const stats = await dashboard(user.id);
  const recent = await recentCampaigns(user.id);
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{user.name.split(" ")[0]}&apos;s mailroom</h1>
          <p className="muted">Lists, drafts, and the record of what went out.</p>
        </div>
        <Link className="btn btn-seal" href="/app/campaigns/new">
          New campaign
        </Link>
      </div>
      {!user.companyName || !user.postalAddress ? (
        <p className="banner warn">
          Add your company name and postal address in <Link href="/app/settings">Settings</Link> before a campaign can send.
          Bulk email laws require both on the letter.
        </p>
      ) : null}
      {!user.smtpConfigured ? (
        <p className="banner warn">
          Capture mode is on. Campaigns are stored in Postroom and not delivered. Add SMTP in{" "}
          <Link href="/app/settings">Settings</Link> when you want real mail to go out.
        </p>
      ) : null}
      <section className="stats">
        <div className="stat">
          <b>{stats.subscribed}</b>
          <span>Subscribed</span>
        </div>
        <div className="stat">
          <b>{stats.lists}</b>
          <span>Lists</span>
        </div>
        <div className="stat">
          <b>{stats.sentCampaigns}</b>
          <span>Campaigns sent</span>
        </div>
        <div className="stat">
          <b>{percent(stats.uniqueOpens, stats.sentRecipients)}</b>
          <span>Open rate</span>
        </div>
      </section>
      <div className="page-header">
        <h2>Recent campaigns</h2>
        <Link href="/app/campaigns">View all</Link>
      </div>
      {recent.length === 0 ? (
        <p className="empty">No campaigns yet. Write the first one when a list is ready.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>List</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((campaign) => (
                <tr key={campaign.id}>
                  <td>
                    <Link href={`/app/campaigns/${campaign.id}`}>{campaign.name}</Link>
                  </td>
                  <td>{campaign.listName || "—"}</td>
                  <td>
                    <Pill status={campaign.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
