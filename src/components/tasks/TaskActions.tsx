"use client";

/**
 * Edit and Delete buttons for one task. Each opens its dialog on the
 * current page; dialogs are only mounted while open, so a long list doesn't
 * carry dozens of hidden dialogs.
 */
import { useState } from "react";
import type { Task } from "@/lib/tasks/types";
import { DeleteTaskDialog } from "./DeleteTaskDialog";
import styles from "./TaskActions.module.css";
import { TaskFormDialog } from "./TaskFormDialog";

export function TaskActions({ task }: { task: Task }) {
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const close = () => setDialog(null);

  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={`btn btn-secondary ${styles.button}`}
        onClick={() => setDialog("edit")}
        aria-label={`Edit “${task.title}”`}
      >
        Edit
      </button>
      <button
        type="button"
        className={`btn btn-secondary ${styles.button} ${styles.danger}`}
        onClick={() => setDialog("delete")}
        aria-label={`Delete “${task.title}”`}
      >
        Delete
      </button>

      {dialog === "edit" && <TaskFormDialog task={task} onClose={close} />}
      {dialog === "delete" && <DeleteTaskDialog task={task} onClose={close} />}
    </div>
  );
}
