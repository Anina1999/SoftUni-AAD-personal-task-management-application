/**
 * One task in a list: a completion tick, title, priority, due date (if any),
 * description preview, timestamps, and Edit/Delete actions (which open
 * dialogs on the current page).
 */
import { formatDate, formatDateTime, formatPriority } from "@/lib/format";
import type { Task } from "@/lib/tasks/types";
import { CompleteTaskToggle } from "./CompleteTaskToggle";
import { TaskActions } from "./TaskActions";
import styles from "./TaskCard.module.css";
import { TaskDescription } from "./TaskDescription";

export function TaskCard({ task }: { task: Task }) {
  const wasEdited = task.updatedAt !== task.createdAt;

  return (
    <article className={styles.card} aria-labelledby={`task-${task.id}-title`}>
      <div className={styles.main}>
        <CompleteTaskToggle task={task} />
        <div className={styles.body}>
          <h3 id={`task-${task.id}-title`} className={styles.title}>
            {task.title}
          </h3>
          <p className={styles.tags}>
            <span className={styles.tag} data-priority={task.priority}>
              {formatPriority(task.priority)} priority
            </span>
            {task.dueDate && (
              <span className={styles.tag}>
                Due <time dateTime={task.dueDate}>{formatDate(task.dueDate)}</time>
              </span>
            )}
          </p>
          <TaskDescription text={task.description} />
          <p className={styles.meta}>
            {wasEdited ? "Updated " : "Created "}
            <time dateTime={wasEdited ? task.updatedAt : task.createdAt}>
              {formatDateTime(wasEdited ? task.updatedAt : task.createdAt)}
            </time>
          </p>
        </div>
      </div>
      <TaskActions task={task} />
    </article>
  );
}
