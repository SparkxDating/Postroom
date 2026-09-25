import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap hero">
      <h1>That page is not here.</h1>
      <p className="lede">The link may be old, or the list or campaign was deleted.</p>
      <div className="hero-actions">
        <Link className="btn btn-primary" href="/app">
          Back to Postroom
        </Link>
      </div>
    </main>
  );
}
