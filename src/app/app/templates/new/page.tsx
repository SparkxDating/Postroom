import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { TemplateForm } from "@/components/template-form";
import { sampleFields } from "@/lib/preview-fields";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "New template" };

export default async function NewTemplatePage() {
  const user = await requireUser();
  return (
    <div className="stack">
      <PageHeader title="New template" lede="Write the letter once. Campaigns copy it." />
      <TemplateForm fields={sampleFields(user)} />
    </div>
  );
}
