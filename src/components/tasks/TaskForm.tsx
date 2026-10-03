"use client";

/**
 * Create/edit form for a task, shown inside `TaskFormDialog`.
 *
 * - Without `task` it creates a new task; with `task` it edits that task.
 * - Submits to the tasks API (`/api/tasks`) through `useActionState`. On
 *   success it calls `onSuccess`; on failure it shows field-level errors and
 *   keeps the values the user typed (inputs are controlled).
 * - Uses `TASK_LIMITS` (the same limits the server enforces) for `maxLength`
 *   and live character counters.
 * - Priority and due date are optional: a new task starts at priority 3 with
 *   no due date, and an empty date field is sent as `dueDate: null`.
 */
import { useActionState, useEffect, useRef, useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatPriority } from "@/lib/format";
import * as api from "@/lib/tasks/api-client";
import type { Task, TaskFieldErrors, TaskPriority } from "@/lib/tasks/types";
import { DEFAULT_PRIORITY, TASK_LIMITS, TASK_PRIORITIES } from "@/lib/tasks/validation";
import styles from "./TaskForm.module.css";

interface TaskFormProps {
  /** The task to edit; omit to create a new one. */
  task?: Task;
  onSuccess: (task: Task) => void;
  onCancel: () => void;
}

type TaskFormState =
  | { status: "idle" }
  | {
      status: "error";
      errors?: TaskFieldErrors;
      /** General error not tied to a single field. */
      formError?: string;
    };

const TASK_GONE = "This task no longer exists. It may have been deleted.";

function readText(formData: FormData, name: string): string {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

export function TaskForm({ task, onSuccess, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? DEFAULT_PRIORITY);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");

  // React resets the form after every submit. Controlled inputs survive that
  // because React mirrors their value into the `value` attribute, but a
  // controlled <select> doesn't, so it would jump back to its first option
  // when the API rejects the task. Mirroring the choice into `defaultSelected`
  // makes the reset keep it.
  const priorityRef = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    for (const option of priorityRef.current?.options ?? []) {
      option.defaultSelected = option.value === String(priority);
    }
  }, [priority]);

  const [state, formAction] = useActionState<TaskFormState, FormData>(
    async (_previous, formData) => {
      const input = {
        title: readText(formData, "title"),
        description: readText(formData, "description"),
        priority: Number(readText(formData, "priority")) as TaskPriority,
        dueDate: readText(formData, "dueDate") || null,
      };
      const result = task ? await api.updateTask(task.id, input) : await api.createTask(input);
      if (result.ok) {
        onSuccess(result.data);
        return { status: "idle" };
      }
      if (task && result.status === 404) return { status: "error", formError: TASK_GONE };
      return result.errors
        ? { status: "error", errors: result.errors }
        : { status: "error", formError: result.error };
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

      <div className={styles.row}>
        <div className="field">
          <label htmlFor="task-priority" className="field-label">
            Priority
          </label>
          <select
            ref={priorityRef}
            id="task-priority"
            name="priority"
            className="field-input"
            value={priority}
            onChange={(event) => setPriority(Number(event.target.value) as TaskPriority)}
            aria-invalid={errors.priority ? true : undefined}
            aria-describedby={errors.priority ? "task-priority-error" : undefined}
          >
            {TASK_PRIORITIES.map((option) => (
              <option key={option} value={option}>
                {option} · {formatPriority(option)}
              </option>
            ))}
          </select>
          {errors.priority && (
            <div className="field-meta">
              <span id="task-priority-error" className="field-error">
                {errors.priority}
              </span>
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="task-due-date" className="field-label">
            Due date <span className="muted">(optional)</span>
          </label>
          <input
            id="task-due-date"
            name="dueDate"
            type="date"
            className="field-input"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            aria-invalid={errors.dueDate ? true : undefined}
            aria-describedby={errors.dueDate ? "task-due-date-error" : undefined}
          />
          {(errors.dueDate || dueDate) && (
            <div className="field-meta">
              {errors.dueDate && (
                <span id="task-due-date-error" className="field-error">
                  {errors.dueDate}
                </span>
              )}
              {dueDate && (
                <button type="button" className={styles.clear} onClick={() => setDueDate("")}>
                  Clear due date
                </button>
              )}
            </div>
          )}
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
