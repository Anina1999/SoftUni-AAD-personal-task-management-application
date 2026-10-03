/**
 * One task in a list: title, description preview, timestamps, and
 * Edit/Delete actions (which open dialogs on the current page).
 */
import { formatDateTime } from "@/lib/format";
import type { Task } from "@/lib/tasks/types";
import { TaskActions } from "./TaskActions";
import styles from "./TaskCard.module.css";
import { TaskDescription } from "./TaskDescription";

export function TaskCard({ task }: { task: Task }) {
  const wasEdited = task.updatedAt !== task.createdAt;

  return (
    <article className={styles.card} aria-labelledby={`task-${task.id}-title`}>
      <div className={styles.body}>
        <h3 id={`task-${task.id}-title`} className={styles.title}>
          {task.title}
        </h3>
        <TaskDescription text={task.description} />
        <p className={styles.meta}>
          {wasEdited ? "Updated " : "Created "}
          <time dateTime={wasEdited ? task.updatedAt : task.createdAt}>
            {formatDateTime(wasEdited ? task.updatedAt : task.createdAt)}
          </time>
        </p>
      </div>
      <TaskActions task={task} />
    </article>
  );
}
