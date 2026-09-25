import { signClick } from "./crypto";
import { composeEmail, formatAddress } from "./render";
import {
  campaignIsSending,
  claimBatch,
  finishCampaigns,
  getAccount,
  markRecipient,
  releaseStaleClaims,
  saveDelivery,
  smtpCredentials,
} from "./queries";
import { deliverMessage } from "./send";
import type { SendJob } from "./types";
import { UserError } from "./user-error";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processJob(job: SendJob): Promise<void> {
  if (!campaignIsSending(job.campaignId)) {
    markRecipient(job.recipientId, "pending", "");
    return;
  }
  if (job.contactStatus !== "subscribed") {
    markRecipient(job.recipientId, "skipped", job.contactStatus === "unsubscribed" ? "Unsubscribed" : "Contact removed");
    return;
  }
  const account = getAccount(job.userId);
  const origin = job.origin || "http://localhost:3010";
  const unsubscribeUrl = `${origin}/u/${job.unsubToken}?c=${job.campaignId}`;
  const composed = composeEmail({
    html: job.html,
    subject: job.subject,
    fields: {
      firstName: job.firstName,
      lastName: job.lastName,
      email: job.email,
      unsubscribeUrl,
      companyName: account.companyName,
      postalAddress: account.postalAddress,
      unsubToken: job.unsubToken,
    },
    track: (url) => {
      const signed = signClick(job.token, url);
      return `${origin}/t/c/${job.token}?u=${signed.payload}&s=${signed.signature}`;
    },
    pixelUrl: `${origin}/t/o/${job.token}`,
  });
  try {
    if (!account.smtpConfigured) {
      saveDelivery({
        recipientId: job.recipientId,
        mode: "capture",
        to: job.email,
        subject: composed.subject,
        html: composed.html,
      });
    } else {
      const smtp = smtpCredentials(job.userId);
      await deliverMessage({
        smtp,
        from: formatAddress(job.fromName, job.fromEmail),
        to: job.email,
        replyTo: job.replyTo,
        subject: composed.subject,
        html: composed.html,
        text: composed.text,
        unsubscribeUrl,
      });
      saveDelivery({
        recipientId: job.recipientId,
        mode: "smtp",
        to: job.email,
        subject: composed.subject,
        html: composed.html,
      });
    }
    markRecipient(job.recipientId, "sent", "");
    if (process.env.POSTROOM_WORKER) {
      console.log(`${account.smtpConfigured ? "smtp" : "capture"} ${job.email}`);
    }
  } catch (error) {
    const message = error instanceof UserError || error instanceof Error ? error.message : "Send failed";
    markRecipient(job.recipientId, "failed", message);
    if (process.env.POSTROOM_WORKER) console.log(`failed ${job.email}: ${message}`);
  }
}

export async function runBatch(limit = 5): Promise<number> {
  releaseStaleClaims();
  const jobs = claimBatch(limit);
  const delay = Number(process.env.SEND_DELAY_MS || 250);
  for (const job of jobs) {
    await processJob(job);
    if (delay > 0) await sleep(delay);
  }
  finishCampaigns();
  return jobs.length;
}
