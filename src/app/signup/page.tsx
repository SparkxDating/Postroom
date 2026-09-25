import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicFrame } from "@/components/public-frame";
import { Flash, SubmitButton } from "@/components/ui";
import { signupAction } from "@/lib/actions/auth";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await currentUser()) redirect("/app");
  const params = await searchParams;
  return (
    <PublicFrame>
      <main className="card auth-card stack">
        <h1>Create your mailroom</h1>
        <p className="muted">Lists, campaigns, and tracking. You connect SMTP when you are ready to deliver.</p>
        <Flash error={params.error} />
        <form action={signupAction} className="stack">
          <label className="field">
            <span>Your name</span>
            <input name="name" autoComplete="name" required />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input name="password" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <SubmitButton pendingLabel="Creating…">Create account</SubmitButton>
        </form>
        <p className="fine">
          Already have an account? <Link className="link" href="/login">Sign in</Link>
        </p>
      </main>
    </PublicFrame>
  );
}
