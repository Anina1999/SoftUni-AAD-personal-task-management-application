"use client";

/**
 * Create/edit form for a task, shown inside `TaskFormDialog`.
 *
 * - Without `task` it creates a new task; with `task` it edits that task.
 * - Submits to a Server Action through `useActionState`. On success it calls
 *   `onSuccess`; on failure it shows field-level errors and keeps the values
 *   the user typed (inputs are controlled, so they survive the round trip).
 * - Uses `TASK_LIMITS` (the same limits the server enforces) for `maxLength`
 *   and live character counters.
 */
import { useActionState, useState } from "react";
import { createTaskAction, updateTaskAction, type TaskFormState } from "@/app/tasks/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Task } from "@/lib/tasks/types";
import { TASK_LIMITS } from "@/lib/tasks/validation";
import styles from "./TaskForm.module.css";

interface TaskFormProps {
  /** The task to edit; omit to create a new one. */
  task?: Task;
  onSuccess: (task: Task) => void;
  onCancel: () => void;
}

const NETWORK_ERROR = "Could not reach the server. Check your connection and try again.";

export function TaskForm({ task, onSuccess, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");

  const [state, formAction] = useActionState<TaskFormState, FormData>(
    async (previous, formData) => {
      let result: TaskFormState;
      try {
        result = task
          ? await updateTaskAction(task.id, previous, formData)
          : await createTaskAction(previous, formData);
      } catch {
        result = { status: "error", formError: NETWORK_ERROR, values: { title, description } };
      }
      if (result.status === "success") onSuccess(result.task);
      return result;
    },
    { status: "idle" },
  );

  const errors = state.status === "error" ? (state.errors ?? {}) : {};
  const formError = state.status === "error" ? state.formError : undefined;

  return (
    <form action={formAction} className={styles.form} noValidate>
      {formError && (
        <p role="alert" className={styles.formError}>
          {formError}
        </p>
      )}

      <div className="field">
        <label htmlFor="task-title" className="field-label">
          Title <span aria-hidden="true">*</span>
        </label>
        <input
          id="task-title"
          name="title"
          type="text"
          className="field-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={TASK_LIMITS.titleMax}
          required
          data-autofocus
          autoComplete="off"
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? "task-title-error task-title-count" : "task-title-count"}
        />
        <div className="field-meta">
          {errors.title && (
            <span id="task-title-error" className="field-error">
              {errors.title}
            </span>
          )}
          <span id="task-title-count" className="field-counter">
            {title.length}/{TASK_LIMITS.titleMax}
          </span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="task-description" className="field-label">
          Description <span className="muted">(optional)</span>
        </label>
        <textarea
          id="task-description"
          name="description"
          className="field-input"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={TASK_LIMITS.descriptionMax}
          rows={6}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={
            errors.description
              ? "task-description-error task-description-count"
              : "task-description-count"
          }
        />
        <div className="field-meta">
          {errors.description && (
            <span id="task-description-error" className="field-error">
              {errors.description}
            </span>
          )}
          <span id="task-description-count" className="field-counter">
            {description.length}/{TASK_LIMITS.descriptionMax}
          </span>
        </div>
      </div>

      <div className={`actions ${styles.actions}`}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <SubmitButton pendingLabel={task ? "Saving…" : "Creating…"}>
          {task ? "Save changes" : "Create task"}
        </SubmitButton>
      </div>
    </form>
  );
}
