import type { Metadata } from "next";
import { Flash, PageHeader, SubmitButton } from "@/components/ui";
import { createCampaignAction } from "@/lib/actions/campaigns";
import { listLists } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "New campaign" };

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const lists = listLists(user.id);
  return (
    <div className="stack">
      <PageHeader title="New campaign" lede="Name it and pick a list. You will write the letter on the next screen." />
      <Flash error={params.error} />
      <form action={createCampaignAction} className="panel stack" style={{ maxWidth: 520 }}>
        <label className="field">
          <span>Name</span>
          <input name="name" placeholder="April announcement" required />
        </label>
        <label className="field">
          <span>List</span>
          <select name="listId" defaultValue="">
            <option value="">Choose later</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name} ({list.subscribedCount} subscribed)
              </option>
            ))}
          </select>
        </label>
        <SubmitButton>Create draft</SubmitButton>
      </form>
    </div>
  );
}
