/** Friendly placeholder for empty lists and searches with no results. */
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional call-to-action (e.g. a link button). */
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={`card ${styles.empty}`}>
      <h2 className={styles.title}>{title}</h2>
      {description && <p className="muted">{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
