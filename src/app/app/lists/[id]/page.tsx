import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmSubmit, Flash, Pager, Pill, SubmitButton } from "@/components/ui";
import { addContactAction } from "@/lib/actions/contacts";
import { deleteListAction, importCsvAction, removeMemberAction, renameListAction } from "@/lib/actions/lists";
import { getList, listMembers } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "List" };

export default async function ListDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string; q?: string; page?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const list = getList(user.id, id);
  if (!list) notFound();
  const page = Number(query.page || 1);
  const members = listMembers(user.id, id, page, query.q || "");
  if (!members) notFound();
  return (
    <div className="stack">
      <Flash error={query.error} notice={query.notice} />
      <form action={renameListAction} className="inline-form">
        <input type="hidden" name="id" value={list.id} />
        <input name="name" defaultValue={list.name} aria-label="List name" required style={{ maxWidth: 360 }} />
        <SubmitButton>Rename</SubmitButton>
      </form>
      <p className="muted">
        {list.subscribedCount} subscribed of {list.contactCount}.{" "}
        <a href={`/app/contacts/export?list=${list.id}`}>Export CSV</a>
      </p>
      <div className="two">
        <form action={addContactAction} className="panel stack">
          <h2>Add a person</h2>
          <input type="hidden" name="listId" value={list.id} />
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" required />
          </label>
          <label className="field">
            <span>First name</span>
            <input name="firstName" />
          </label>
          <label className="field">
            <span>Last name</span>
            <input name="lastName" />
          </label>
          <SubmitButton>Add to list</SubmitButton>
        </form>
        <form action={importCsvAction} className="panel stack">
          <h2>Import CSV</h2>
          <p className="fine">Header row required. Use columns email, first name, and last name. Unsubscribed people stay unsubscribed.</p>
          <input type="hidden" name="listId" value={list.id} />
          <input name="file" type="file" accept=".csv,text/csv" required />
          <SubmitButton pendingLabel="Importing…">Import</SubmitButton>
        </form>
      </div>
      <form action={`/app/lists/${list.id}`} method="get" className="inline-form">
        <input name="q" defaultValue={query.q || ""} placeholder="Search this list" aria-label="Search this list" style={{ maxWidth: 280 }} />
        <button className="btn btn-ghost" type="submit">
          Search
        </button>
      </form>
      {members.rows.length === 0 ? (
        <p className="empty">Nobody on this list yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Status</th>
                <th className="actions"> </th>
              </tr>
            </thead>
            <tbody>
              {members.rows.map((contact) => (
                <tr key={contact.id}>
                  <td>{contact.email}</td>
                  <td>
                    {contact.firstName} {contact.lastName}
                  </td>
                  <td>
                    <Pill status={contact.status} />
                  </td>
                  <td className="actions">
                    <form action={removeMemberAction}>
                      <input type="hidden" name="listId" value={list.id} />
                      <input type="hidden" name="contactId" value={contact.id} />
                      <button className="btn btn-ghost" type="submit">
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager path={`/app/lists/${list.id}`} page={members.page} total={members.total} pageSize={members.pageSize} query={query.q || ""} />
      <form action={deleteListAction} className="danger-zone">
        <input type="hidden" name="id" value={list.id} />
        <p className="fine">Deleting the list does not delete the people on it.</p>
        <ConfirmSubmit label="Delete list" message="Delete this list? Contacts are kept." className="btn btn-danger" />
      </form>
    </div>
  );
}
