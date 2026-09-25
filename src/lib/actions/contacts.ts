"use server";

import { redirect } from "next/navigation";
import { addContact, deleteContact, setContactStatus } from "../queries";
import { requireUser } from "../session";
import { UserError } from "../user-error";
import { withMessage } from "../validators";

export async function addContactAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const listId = String(formData.get("listId") || "") || null;
  const back = listId ? `/app/lists/${listId}` : "/app/contacts";
  try {
    const result = addContact(user.id, {
      email: String(formData.get("email") || ""),
      firstName: String(formData.get("firstName") || ""),
      lastName: String(formData.get("lastName") || ""),
      listId,
    });
    const message = result.created
      ? "Contact added."
      : result.status === "unsubscribed"
        ? "That person is already on file and stays unsubscribed."
        : "That person is already on file. Their name was updated.";
    redirect(withMessage(back, result.status === "unsubscribed" && !result.created ? "error" : "notice", message));
  } catch (error) {
    if (error instanceof UserError) redirect(withMessage(back, "error", error.message));
    throw error;
  }
}

export async function setStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const status = formData.get("status") === "subscribed" ? "subscribed" : "unsubscribed";
  const back = String(formData.get("back") || "/app/contacts");
  try {
    setContactStatus(user.id, String(formData.get("id") || ""), status);
  } catch (error) {
    if (error instanceof UserError) redirect(withMessage(back, "error", error.message));
    throw error;
  }
  redirect(withMessage(back.startsWith("/app") ? back : "/app/contacts", "notice", status === "subscribed" ? "Subscribed again." : "Unsubscribed."));
}

export async function deleteContactAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const back = String(formData.get("back") || "/app/contacts");
  try {
    deleteContact(user.id, String(formData.get("id") || ""));
  } catch (error) {
    if (error instanceof UserError) redirect(withMessage("/app/contacts", "error", error.message));
    throw error;
  }
  redirect(withMessage(back.startsWith("/app") ? back : "/app/contacts", "notice", "Contact deleted."));
}
