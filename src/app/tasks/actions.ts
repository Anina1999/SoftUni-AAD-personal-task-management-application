"use server";

/**
 * Server Actions for the tasks module (create, update, delete).
 *
 * They are called from the task dialogs and return a result object instead
 * of redirecting, so the UI stays on the current page:
 *  - on success they revalidate every page that shows tasks (Home, Tasks),
 *    which makes Next.js re-render the current page with fresh data;
 *  - on failure they return field errors / a general message together with
 *    the submitted values, so nothing the user typed is lost.
 */
import { revalidatePath } from "next/cache";
import * as tasks from "@/lib/tasks/service";
import type { Task, TaskFieldErrors, TaskInput } from "@/lib/tasks/types";

/** Result of a create/update submission. */
export type TaskFormState =
  | { status: "idle" }
  | { status: "success"; task: Task }
  | {
      status: "error";
      errors?: TaskFieldErrors;
      /** General error not tied to a single field. */
      formError?: string;
      values: TaskInput;
    };

/** Result of a delete submission. */
export type DeleteTaskState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

const SAVE_FAILED = "Could not save the task. Please try again.";
const DELETE_FAILED = "Could not delete the task. Please try again.";
const TASK_GONE = "This task no longer exists. It may have been deleted.";

function readTaskForm(formData: FormData): TaskInput {
  const value = (name: string) => {
    const entry = formData.get(name);
    return typeof entry === "string" ? entry : "";
  };
  return { title: value("title"), description: value("description") };
}

/** Action arguments come from the client, so ids are re-validated here. */
function toTaskId(id: unknown): number | null {
  return tasks.parseTaskId(String(id));
}

/** Refreshes every page that lists tasks or the task count. */
function revalidateTaskPages(): void {
  revalidatePath("/", "layout");
}

/** Creates a task. */
export async function createTaskAction(
  _previous: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const values = readTaskForm(formData);
  try {
    const result = tasks.createTask(values);
    if (!result.ok) return { status: "error", errors: result.errors, values };
    revalidateTaskPages();
    return { status: "success", task: result.task };
  } catch (error) {
    console.error("createTaskAction failed", error);
    return { status: "error", formError: SAVE_FAILED, values };
  }
}

/** Updates the task with the given id. */
export async function updateTaskAction(
  id: number,
  _previous: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const values = readTaskForm(formData);
  const taskId = toTaskId(id);
  if (taskId === null) return { status: "error", formError: TASK_GONE, values };

  try {
    const result = tasks.updateTask(taskId, values);
    if (!result) return { status: "error", formError: TASK_GONE, values };
    if (!result.ok) return { status: "error", errors: result.errors, values };
    revalidateTaskPages();
    return { status: "success", task: result.task };
  } catch (error) {
    console.error("updateTaskAction failed", error);
    return { status: "error", formError: SAVE_FAILED, values };
  }
}

/**
 * Deletes the task with the given id.
 * Deleting an already-deleted task counts as success (idempotent).
 */
export async function deleteTaskAction(id: number): Promise<DeleteTaskState> {
  const taskId = toTaskId(id);
  if (taskId === null) return { status: "success" };

  try {
    tasks.deleteTask(taskId);
    revalidateTaskPages();
    return { status: "success" };
  } catch (error) {
    console.error("deleteTaskAction failed", error);
    return { status: "error", message: DELETE_FAILED };
  }
}
