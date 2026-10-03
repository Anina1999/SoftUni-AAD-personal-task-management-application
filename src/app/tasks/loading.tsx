/**
 * Instant loading skeleton for the Tasks page, shown while the server renders
 * the page (streamed by Next.js).
 */
import styles from "./tasks.module.css";

export default function TasksLoading() {
  return (
    <div aria-busy="true" aria-label="Loading tasks">
      <div className="page-header">
        <div className={styles.skeleton} style={{ width: 120, height: 32 }} />
        <div className={styles.skeleton} style={{ width: 120, height: 44 }} />
      </div>
      <div className={styles.skeleton} style={{ height: 44, marginBottom: 16 }} />
      <ul className="task-list">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className={`${styles.skeleton} ${styles.skeletonCard}`} />
        ))}
      </ul>
    </div>
  );
}
