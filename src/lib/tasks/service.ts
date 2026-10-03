/**
 * Tasks service: business rules for the tasks module.
 *
 * This is the API that pages and Server Actions use. It validates input,
 * handles pagination math and id parsing, and delegates storage to the
 * repository. It has no dependency on Next.js, so future entry points
 * (e.g. `/api/*` route handlers or scripts) can reuse it unchanged.
 */
import "server-only";
import * as repository from "./repository";
import type { Page, Task, TaskFieldErrors } from "./types";
import { validateTaskInput } from "./validation";

/** Number of tasks shown per list page. */
export const PAGE_SIZE = 20;

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
 */
export function listTasks(options: { search?: string; page?: number }): Page<Task> {
  const search = normaliseSearch(options.search);
  const total = repository.countTasks(search);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requested = Number.isInteger(options.page) ? options.page! : 1;
  const page = Math.min(Math.max(1, requested), totalPages);

  const items = repository.findTasks({
    search,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  return { items, total, page, pageSize: PAGE_SIZE, totalPages };
}

/** Returns the total number of tasks. */
export function countTasks(): number {
  return repository.countTasks();
}

/** Returns the most recently created tasks (newest first). */
export function listRecentTasks(limit = 5): Task[] {
  return repository.findTasks({ limit, offset: 0 });
}

/** Returns a task by id, or `undefined` if it doesn't exist. */
export function getTask(id: number): Task | undefined {
  return repository.findTaskById(id);
}

/** Validates and creates a task. */
export function createTask(raw: { title?: unknown; description?: unknown }): MutationResult {
  const result = validateTaskInput(raw);
  if (!result.ok) return result;
  return { ok: true, task: repository.insertTask(result.value) };
}

/**
 * Validates and updates a task.
 * @returns `undefined` if the task doesn't exist, otherwise the mutation result.
 */
export function updateTask(
  id: number,
  raw: { title?: unknown; description?: unknown },
): MutationResult | undefined {
  const result = validateTaskInput(raw);
  if (!result.ok) return result;
  const task = repository.updateTask(id, result.value);
  return task ? { ok: true, task } : undefined;
}

/**
 * Deletes a task.
 * @returns `true` if the task existed and was deleted.
 */
export function deleteTask(id: number): boolean {
  return repository.deleteTask(id);
}
