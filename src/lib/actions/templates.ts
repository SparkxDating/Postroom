"use server";

import { redirect } from "next/navigation";
import { deleteTemplate, getTemplate, saveCampaign, saveTemplate } from "../queries";
import { requireUser } from "../session";
import { UserError } from "../user-error";
import { withMessage } from "../validators";

export async function saveTemplateAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") || "") || undefined;
  try {
    const saved = saveTemplate(user.id, {
      id,
      name: String(formData.get("name") || ""),
      subject: String(formData.get("subject") || ""),
      html: String(formData.get("html") || ""),
    });
    redirect(withMessage(`/app/templates/${saved}`, "notice", "Template saved."));
  } catch (error) {
    if (error instanceof UserError) {
      redirect(withMessage(id ? `/app/templates/${id}` : "/app/templates/new", "error", error.message));
    }
    throw error;
  }
}

export async function deleteTemplateAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  deleteTemplate(user.id, String(formData.get("id") || ""));
  redirect(withMessage("/app/templates", "notice", "Template deleted."));
}

export async function campaignFromTemplateAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const template = getTemplate(user.id, String(formData.get("id") || ""));
  if (!template) redirect(withMessage("/app/templates", "error", "Template not found."));
  const id = saveCampaign(user.id, {
    name: template.name,
    subject: template.subject,
    html: template.html,
    listId: null,
    fromName: user.fromName,
    fromEmail: user.fromEmail || user.email,
    replyTo: user.replyTo,
  });
  redirect(`/app/campaigns/${id}`);
}
