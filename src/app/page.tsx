/**
 * Home page (`/`): overview cards (task count, quick "add task") and the
 * most recently created tasks. Creating, editing, and deleting happen in
 * dialogs on this page; Server Actions revalidate it, so the count and the
 * recent list update immediately.
 */
import Link from "next/link";
import { connection } from "next/server";
import { NewTaskButton } from "@/components/tasks/NewTaskButton";
import { TaskCard } from "@/components/tasks/TaskCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { countTasks, listRecentTasks } from "@/lib/tasks/service";
import styles from "./home.module.css";

const RECENT_TASKS_LIMIT = 5;

export default async function HomePage() {
  // Always render with fresh data (opt out of build-time prerendering).
  await connection();

  const total = countTasks();
  const recent = listRecentTasks(RECENT_TASKS_LIMIT);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Home</h1>
      </div>

      <section className={styles.cards} aria-label="Overview">
        <div className={`card ${styles.statCard}`}>
          <h2 className={styles.cardLabel}>Total tasks</h2>
          <p className={styles.statValue}>{total.toLocaleString("en-GB")}</p>
          <Link href="/tasks" className={styles.cardLink}>
            View all tasks <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className={`card ${styles.actionCard}`}>
          <h2 className={styles.cardLabel}>Add a new task</h2>
          <p className="muted">Capture something you need to do. It takes a few seconds.</p>
          <NewTaskButton label="Add task" />
        </div>
      </section>

      <section className={styles.recent} aria-labelledby="recent-heading">
        <div className={styles.sectionHeader}>
          <h2 id="recent-heading" className={styles.sectionTitle}>
            Recent tasks
          </h2>
          {total > RECENT_TASKS_LIMIT && (
            <Link href="/tasks" className={styles.cardLink}>
              See all
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title="No tasks yet"
            description="Use “Add task” above to create your first one."
          />
        ) : (
          <ul className="task-list">
            {recent.map((task) => (
              <li key={task.id}>
                <TaskCard task={task} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
