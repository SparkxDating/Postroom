import Link from "next/link";
import type { Metadata } from "next";
import { Flash, PageHeader, SubmitButton } from "@/components/ui";
import { createListAction } from "@/lib/actions/lists";
import { listLists } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { formatWhen } from "@/lib/time";

export const metadata: Metadata = { title: "Lists" };

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const lists = await listLists(user.id);
  return (
    <div>
      <PageHeader title="Lists" lede="A list is who can receive a campaign. People can be on more than one." />
      <Flash error={params.error} notice={params.notice} />
      <form action={createListAction} className="inline-form" style={{ marginBottom: 16 }}>
        <input name="name" placeholder="New list name" aria-label="New list name" required style={{ maxWidth: 320 }} />
        <SubmitButton>Create list</SubmitButton>
      </form>
      {lists.length === 0 ? (
        <p className="empty">No lists yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Subscribed</th>
                <th>People</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {lists.map((list) => (
                <tr key={list.id}>
                  <td>
                    <Link href={`/app/lists/${list.id}`}>{list.name}</Link>
                  </td>
                  <td>{list.subscribedCount}</td>
                  <td>{list.contactCount}</td>
                  <td>{formatWhen(list.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
