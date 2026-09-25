"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="stack">
      <h1>Something went wrong</h1>
      <p className="muted">Postroom could not finish that request.</p>
      <button className="btn btn-primary" type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
