"use client";

/**
 * Error boundary for all pages. Shows a friendly message instead of a
 * crash and lets the user retry. Details are logged on the server; in
 * production only the error digest reaches the browser.
 */
import Link from "next/link";
import { useEffect } from "react";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card stack" role="alert">
      <h1 className="page-title">Something went wrong</h1>
      <p className="muted">
        We couldn’t load this page. Your data is safe — please try again.
        {error.digest && <> (Reference: {error.digest})</>}
      </p>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={() => retry()}>
          Try again
        </button>
        <Link href="/" className="btn btn-secondary">
          Go to Home
        </Link>
      </div>
    </div>
  );
}
