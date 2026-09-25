import Link from "next/link";
import { Mark } from "./mark";

export function PublicFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="airmail" />
      <header className="public-bar wrap">
        <Link href="/" className="brand">
          <Mark /> Postroom
        </Link>
        <nav>
          <Link href="/login">Sign in</Link>
          <Link href="/signup" className="btn btn-primary">
            Create account
          </Link>
        </nav>
      </header>
      {children}
    </>
  );
}
