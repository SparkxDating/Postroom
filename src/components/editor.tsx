"use client";

import { useRef, useState } from "react";
import { saveCampaignAction } from "@/lib/actions/campaigns";
import { composeEmail, type MergeFields } from "@/lib/render";
import type { Campaign, ContactList } from "@/lib/types";
import { SubmitButton } from "./ui";

const TAGS = ["{{first_name}}", "{{last_name}}", "{{email}}", "{{company_name}}", "{{unsubscribe_url}}"];

export function CampaignEditor({
  campaign,
  lists,
  fields,
}: {
  campaign: Campaign;
  lists: ContactList[];
  fields: MergeFields;
}) {
  const [html, setHtml] = useState(campaign.html);
  const [subject, setSubject] = useState(campaign.subject);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const preview = composeEmail({
    html,
    subject,
    fields,
    track: (url) => url,
  });

  function insertTag(tag: string) {
    const el = bodyRef.current;
    const start = el?.selectionStart ?? html.length;
    const end = el?.selectionEnd ?? html.length;
    const next = `${html.slice(0, start)}${tag}${html.slice(end)}`;
    setHtml(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + tag.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  return (
    <form action={saveCampaignAction} className="editor-grid">
      <input type="hidden" name="id" value={campaign.id} />
      <div className="stack">
        <label className="field">
          <span>Campaign name</span>
          <input name="name" defaultValue={campaign.name} required />
        </label>
        <label className="field">
          <span>Subject</span>
          <input name="subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
        </label>
        <label className="field">
          <span>List</span>
          <select name="listId" defaultValue={campaign.listId ?? ""}>
            <option value="">Choose a list</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name} ({list.subscribedCount} subscribed)
              </option>
            ))}
          </select>
        </label>
        <div className="two">
          <label className="field">
            <span>From name</span>
            <input name="fromName" defaultValue={campaign.fromName} />
          </label>
          <label className="field">
            <span>From email</span>
            <input name="fromEmail" defaultValue={campaign.fromEmail} />
          </label>
        </div>
        <label className="field">
          <span>Reply-to</span>
          <input name="replyTo" defaultValue={campaign.replyTo} placeholder="Optional" />
        </label>
        <div className="field">
          <span>Body</span>
          <div className="tag-row">
            {TAGS.map((tag) => (
              <button key={tag} type="button" onClick={() => insertTag(tag)}>
                {tag}
              </button>
            ))}
          </div>
          <textarea ref={bodyRef} name="html" value={html} onChange={(event) => setHtml(event.target.value)} />
        </div>
        <div className="action-row">
          <SubmitButton pendingLabel="Saving…">Save draft</SubmitButton>
          <button className="btn btn-seal" type="submit" name="intent" value="review">
            Review and send
          </button>
        </div>
      </div>
      <div className="stack">
        <p className="fine">
          Preview uses Alex Morgan. A real send fills each person&apos;s name, rewrites links for click tracking, and adds the open pixel.
        </p>
        <p>
          <strong>{preview.subject || "No subject yet"}</strong>
        </p>
        <iframe className="preview-frame" sandbox="" title="Email preview" srcDoc={preview.html} />
      </div>
    </form>
  );
}
