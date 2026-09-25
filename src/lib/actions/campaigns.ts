"use server";

import { redirect } from "next/navigation";
import {
  deleteCampaign,
  duplicateCampaign,
  queueCampaign,
  saveCampaign,
  setCampaignStatus,
} from "../queries";
import { requestOrigin } from "../origin";
import { requireUser } from "../session";
import { UserError } from "../user-error";
import { withMessage } from "../validators";

export async function createCampaignAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  try {
    const id = saveCampaign(user.id, {
      name: String(formData.get("name") || ""),
      subject: "",
      html: "",
      listId: String(formData.get("listId") || "") || null,
      fromName: user.fromName,
      fromEmail: user.fromEmail || user.email,
      replyTo: user.replyTo,
    });
    redirect(`/app/campaigns/${id}`);
  } catch (error) {
    if (error instanceof UserError) redirect(withMessage("/app/campaigns/new", "error", error.message));
    throw error;
  }
}

export async function saveCampaignAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  try {
    saveCampaign(user.id, {
      id,
      name: String(formData.get("name") || ""),
      subject: String(formData.get("subject") || ""),
      html: String(formData.get("html") || ""),
      listId: String(formData.get("listId") || "") || null,
      fromName: String(formData.get("fromName") || ""),
      fromEmail: String(formData.get("fromEmail") || ""),
      replyTo: String(formData.get("replyTo") || ""),
    });
  } catch (error) {
    if (error instanceof UserError) redirect(withMessage(`/app/campaigns/${id}`, "error", error.message));
    throw error;
  }
  if (String(formData.get("intent") || "") === "review") redirect(`/app/campaigns/${id}/send`);
  redirect(withMessage(`/app/campaigns/${id}`, "notice", "Draft saved."));
}

export async function queueCampaignAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  let queued = 0;
  try {
    queued = queueCampaign(user.id, id, await requestOrigin()).queued;
  } catch (error) {
    if (error instanceof UserError) redirect(withMessage(`/app/campaigns/${id}/send`, "error", error.message));
    throw error;
  }
  redirect(
    withMessage(
      `/app/campaigns/${id}`,
      "notice",
      `Queued ${queued} ${queued === 1 ? "person" : "people"}. The worker sends them in the background.`,
    ),
  );
}

export async function pauseCampaignAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  try {
    setCampaignStatus(user.id, id, "paused");
  } catch (error) {
    if (error instanceof UserError) redirect(withMessage(`/app/campaigns/${id}`, "error", error.message));
    throw error;
  }
  redirect(withMessage(`/app/campaigns/${id}`, "notice", "Sending is paused."));
}

export async function resumeCampaignAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  try {
    setCampaignStatus(user.id, id, "sending");
  } catch (error) {
    if (error instanceof UserError) redirect(withMessage(`/app/campaigns/${id}`, "error", error.message));
    throw error;
  }
  redirect(withMessage(`/app/campaigns/${id}`, "notice", "Sending resumed."));
}

export async function duplicateCampaignAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  try {
    const id = duplicateCampaign(user.id, String(formData.get("id") || ""));
    redirect(`/app/campaigns/${id}`);
  } catch (error) {
    if (error instanceof UserError) redirect(withMessage("/app/campaigns", "error", error.message));
    throw error;
  }
}

export async function deleteCampaignAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  deleteCampaign(user.id, String(formData.get("id") || ""));
  redirect(withMessage("/app/campaigns", "notice", "Campaign deleted."));
}
