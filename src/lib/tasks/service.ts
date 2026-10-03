/**
 * Tasks service: business rules for the tasks module.
 *
 * This is the API that pages and the `/api/tasks` route handlers use. It
 * validates input, handles pagination math and id parsing, and delegates
 * storage to the repository. It has no dependency on Next.js, so other entry
 * points (e.g. scripts) can reuse it unchanged.
 */
import "server-only";
import * as repository from "./repository";
import type { Page, Task, TaskFieldErrors } from "./types";
import { type RawTaskInput, validateTaskInput } from "./validation";

/** Number of tasks shown per list page. */
export const PAGE_SIZE = 20;

/** Largest page size a caller (e.g. an API client) may request. */
export const MAX_PAGE_SIZE = 100;

/** Search terms longer than this are truncated (keeps queries cheap). */
const MAX_SEARCH_LENGTH = 200;

/** Result of a create/update attempt. */
export type MutationResult =
  | { ok: true; task: Task }
  | { ok: false; errors: TaskFieldErrors };

/**
 * Parses a route/form id into a positive integer.
 * @returns The id, or `null` if the value isn't a valid task id.
 */
export function parseTaskId(raw: unknown): number | null {
  if (typeof raw !== "string" || !/^[1-9]\d{0,15}$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

/** Normalises a raw search term; returns `""` when there is nothing to search. */
export function normaliseSearch(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().slice(0, MAX_SEARCH_LENGTH) : "";
}

/**
 * Lists tasks newest-first, one page at a time.
 *
 * @param options.search - Optional search term (matched in title/description).
 * @param options.page - Requested 1-based page; out-of-range values are clamped.
 * @param options.pageSize - Tasks per page (default `PAGE_SIZE`), clamped to 1..`MAX_PAGE_SIZE`.
 */
export function listTasks(options: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Page<Task> {
  const search = normaliseSearch(options.search);
  const pageSize = Number.isInteger(options.pageSize)
    ? Math.min(Math.max(1, options.pageSize!), MAX_PAGE_SIZE)
    : PAGE_SIZE;
  const total = repository.countTasks(search);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const requested = Number.isInteger(options.page) ? options.page! : 1;
  const page = Math.min(Math.max(1, requested), totalPages);

  const items = repository.findTasks({
    search,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return { items, total, page, pageSize, totalPages };
}

/** Returns the total number of tasks. */
export function countTasks(): number {
  return repository.countTasks();
}

/** Returns a task by id, or `undefined` if it doesn't exist. */
export function getTask(id: number): Task | undefined {
  return repository.findTaskById(id);
}

/**
 * Validates and creates a task. `priority` defaults to 3 and `dueDate` to
 * `null` when left out.
 */
export function createTask(raw: RawTaskInput): MutationResult {
  const result = validateTaskInput(raw);
  if (!result.ok) return result;
  return { ok: true, task: repository.insertTask(result.value) };
}

/**
 * Validates and updates a task. Fields that are left out (`undefined`) keep
 * their current value, so callers can send only what changed. A `null`
 * `dueDate` removes the due date; a `null` `priority` resets it to 3.
 *
 * `completed: true` marks the task as completed and `false` reopens it. Sent
 * on its own, it changes only the completion state, not `updatedAt`.
 * @returns `undefined` if the task doesn't exist, otherwise the mutation result.
 */
export function updateTask(
  id: number,
  raw: RawTaskInput & { completed?: unknown },
): MutationResult | undefined {
  const { completed, ...fields } = raw;
  if (completed !== undefined && typeof completed !== "boolean") {
    return { ok: false, errors: { completed: "Completed must be true or false." } };
  }

  // better-sqlite3 is synchronous, so no other write can run between this
  // read and the updates below.
  const existing = repository.findTaskById(id);
  if (!existing) return undefined;

  let task: Task | undefined = existing;
  const editsContent =
    completed === undefined || Object.values(fields).some((value) => value !== undefined);
  if (editsContent) {
    const result = validateTaskInput({
      title: fields.title === undefined ? existing.title : fields.title,
      description: fields.description === undefined ? existing.description : fields.description,
      priority: fields.priority === undefined ? existing.priority : fields.priority,
      dueDate: fields.dueDate === undefined ? existing.dueDate : fields.dueDate,
    });
    if (!result.ok) return result;
    task = repository.updateTask(id, result.value);
  }
  if (task && completed !== undefined) task = repository.setTaskCompleted(id, completed);
  return task ? { ok: true, task } : undefined;
}

/**
 * Deletes a task.
 * @returns `true` if the task existed and was deleted.
 */
export function deleteTask(id: number): boolean {
  return repository.deleteTask(id);
}
