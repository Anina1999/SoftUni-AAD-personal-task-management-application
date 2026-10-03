"use client";

/**
 * Confirmation dialog shown before a task is deleted. It names the task and
 * explains that deletion is permanent; nothing is deleted until the user
 * confirms. Errors are shown inside the dialog, which then stays open.
 */
import { useActionState } from "react";
import { deleteTaskAction, type DeleteTaskState } from "@/app/tasks/actions";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useToast } from "@/components/ui/Toast";
import type { Task } from "@/lib/tasks/types";
import styles from "./DeleteTaskDialog.module.css";

interface DeleteTaskDialogProps {
  task: Task;
  onClose: () => void;
}

const NETWORK_ERROR = "Could not reach the server. Check your connection and try again.";

export function DeleteTaskDialog({ task, onClose }: DeleteTaskDialogProps) {
  const toast = useToast();

  const [state, formAction] = useActionState<DeleteTaskState, FormData>(async () => {
    let result: DeleteTaskState;
    try {
      result = await deleteTaskAction(task.id);
    } catch {
      result = { status: "error", message: NETWORK_ERROR };
    }
    if (result.status === "success") {
      toast(`Deleted “${task.title}”.`);
      onClose();
    }
    return result;
  }, { status: "idle" });

  return (
    <Modal title="Delete task?" onClose={onClose} role="alertdialog" size="sm">
      <form action={formAction} className={styles.body}>
        <div className={styles.info}>
          <span className={styles.icon} aria-hidden="true">
            !
          </span>
          <p>
            <strong className={styles.taskTitle}>“{task.title}”</strong> will be permanently
            deleted. This action can’t be undone.
          </p>
        </div>

        {state.status === "error" && (
          <p role="alert" className="field-error">
            {state.message}
          </p>
        )}

        <div className={`actions ${styles.actions}`}>
          <button type="button" className="btn btn-secondary" onClick={onClose} data-autofocus>
            Cancel
          </button>
          <SubmitButton variant="danger" pendingLabel="Deleting…">
            Delete
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
