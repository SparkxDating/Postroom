"use client";

import { useState } from "react";
import { saveTemplateAction } from "@/lib/actions/templates";
import { composeEmail, type MergeFields } from "@/lib/render";
import type { Template } from "@/lib/types";
import { SubmitButton } from "./ui";

export function TemplateForm({ template, fields }: { template?: Template; fields: MergeFields }) {
  const [html, setHtml] = useState(template?.html ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const preview = composeEmail({ html, subject, fields, track: (url) => url });
  return (
    <form action={saveTemplateAction} className="editor-grid">
      {template ? <input type="hidden" name="id" value={template.id} /> : null}
      <div className="stack">
        <label className="field">
          <span>Name</span>
          <input name="name" defaultValue={template?.name ?? ""} required />
        </label>
        <label className="field">
          <span>Subject</span>
          <input name="subject" value={subject} onChange={(event) => setSubject(event.target.value)} required />
        </label>
        <label className="field">
          <span>HTML</span>
          <textarea name="html" value={html} onChange={(event) => setHtml(event.target.value)} required />
        </label>
        <p className="fine">{"Tags: {{first_name}} {{last_name}} {{email}} {{company_name}} {{postal_address}} {{unsubscribe_url}}"}</p>
        <SubmitButton>Save template</SubmitButton>
      </div>
      <div className="stack">
        <p>
          <strong>{preview.subject || "Subject preview"}</strong>
        </p>
        <iframe className="preview-frame" sandbox="" title="Template preview" srcDoc={preview.html} />
      </div>
    </form>
  );
}
