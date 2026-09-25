import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Flash, PageHeader } from "@/components/ui";
import { TemplateForm } from "@/components/template-form";
import { sampleFields } from "@/lib/preview-fields";
import { getTemplate } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Edit template" };

export default async function EditTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const template = await getTemplate(user.id, id);
  if (!template) notFound();
  return (
    <div className="stack">
      <PageHeader title={template.name} lede="Changes apply to future campaigns that start from this template." />
      <Flash error={query.error} notice={query.notice} />
      <TemplateForm template={template} fields={sampleFields(user)} />
    </div>
  );
}
