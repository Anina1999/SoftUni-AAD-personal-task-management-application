/** Global 404 page for unknown URLs. */
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card stack">
      <h1 className="page-title">Page not found</h1>
      <p className="muted">The page you’re looking for doesn’t exist.</p>
      <div className="actions">
        <Link href="/tasks" className="btn btn-primary">
          Go to tasks
        </Link>
      </div>
    </div>
  );
}
