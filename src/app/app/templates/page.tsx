import Link from "next/link";
import type { Metadata } from "next";
import { ConfirmSubmit, Flash, PageHeader, SubmitButton } from "@/components/ui";
import { campaignFromTemplateAction, deleteTemplateAction } from "@/lib/actions/templates";
import { listTemplates } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const templates = await listTemplates(user.id);
  return (
    <div>
      <PageHeader
        title="Templates"
        lede="Reusable letters. A campaign copies the HTML, so later edits do not change mail already sent."
        action={
          <Link className="btn btn-primary" href="/app/templates/new">
            New template
          </Link>
        }
      />
      <Flash error={params.error} notice={params.notice} />
      {templates.length === 0 ? (
        <p className="empty">No templates. The starters are created with your account.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Subject</th>
                <th className="actions"> </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id}>
                  <td>
                    <Link href={`/app/templates/${template.id}`}>{template.name}</Link>
                  </td>
                  <td>{template.subject}</td>
                  <td className="actions">
                    <div className="row-actions">
                      <form action={campaignFromTemplateAction}>
                        <input type="hidden" name="id" value={template.id} />
                        <SubmitButton className="btn btn-ghost" pendingLabel="Creating…">
                          Use in campaign
                        </SubmitButton>
                      </form>
                      <form action={deleteTemplateAction}>
                        <input type="hidden" name="id" value={template.id} />
                        <ConfirmSubmit label="Delete" message="Delete this template?" />
                      </form>
                    </div>
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
