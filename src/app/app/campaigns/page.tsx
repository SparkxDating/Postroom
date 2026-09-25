import Link from "next/link";
import type { Metadata } from "next";
import { Flash, PageHeader, Pill } from "@/components/ui";
import { listCampaigns } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { formatWhen } from "@/lib/time";

export const metadata: Metadata = { title: "Campaigns" };

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const campaigns = listCampaigns(user.id);
  return (
    <div>
      <PageHeader
        title="Campaigns"
        lede="A campaign is one letter to one list. Drafts stay editable until you queue them."
        action={
          <Link className="btn btn-seal" href="/app/campaigns/new">
            New campaign
          </Link>
        }
      />
      <Flash error={params.error} notice={params.notice} />
      {campaigns.length === 0 ? (
        <p className="empty">No campaigns yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>List</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td>
                    <Link href={`/app/campaigns/${campaign.id}`}>{campaign.name}</Link>
                    <div className="fine">{campaign.subject || "No subject"}</div>
                  </td>
                  <td>{campaign.listName || "—"}</td>
                  <td>
                    <Pill status={campaign.status} />
                  </td>
                  <td>{formatWhen(campaign.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
