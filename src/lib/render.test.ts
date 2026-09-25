import assert from "node:assert/strict";
import test from "node:test";
import { composeEmail, type MergeFields } from "./render";

const fields: MergeFields = {
  firstName: "<script>",
  lastName: "Morgan",
  email: "alex@example.com",
  unsubscribeUrl: "https://app.example/u/token-1?c=camp",
  companyName: "Northwind",
  postalAddress: "1 Market Street\nAustin, TX",
  unsubToken: "token-1",
};

test("escapes merge fields, adds the footer once, and rewrites only http links", () => {
  const first = composeEmail({
    html: `<p>Hi {{first_name}}</p><a href="https://example.com/hello">Read</a><a href="mailto:ada@example.com">Mail</a>`,
    subject: "Hello {{first_name}}\r\nBcc: bad@example.com",
    fields,
    track: (url) => `https://app.example/t/c/token-1?u=${encodeURIComponent(url)}`,
    pixelUrl: "https://app.example/t/o/token-1",
  });
  assert.equal(first.html.includes("<script>"), false);
  assert.match(first.html, /&lt;script&gt;/);
  assert.equal(first.html.includes('href="https://example.com/hello"'), false);
  assert.match(first.html, /https:\/\/app\.example\/t\/c\/token-1/);
  assert.match(first.html, /href="mailto:ada@example.com"/);
  assert.match(first.html, /https:\/\/app\.example\/u\/token-1/);
  assert.match(first.html, /Northwind/);
  assert.match(first.html, /1 Market Street<br\/>Austin, TX/);
  assert.match(first.html, /\/t\/o\/token-1/);
  assert.equal(first.subject, "Hello <script> Bcc: bad@example.com");
  assert.equal(first.subject.includes("\n"), false);
  assert.equal(first.subject.includes("\r"), false);
  const second = composeEmail({
    html: first.html,
    subject: first.subject,
    fields,
    track: (url) => url,
  });
  assert.equal(second.html.match(/data-postroom-footer/g)?.length, 1);
});
