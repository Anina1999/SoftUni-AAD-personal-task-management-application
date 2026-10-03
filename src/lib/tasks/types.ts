/**
 * Domain types for the tasks module.
 * Safe to import from both server and client code (types only).
 */

/** A persisted task. Timestamps are ISO-8601 strings in UTC. */
export interface Task {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/** User-editable fields of a task (used for create and update). */
export interface TaskInput {
  title: string;
  description: string;
}

/** Field-level validation messages, keyed by input name. */
export type TaskFieldErrors = Partial<Record<keyof TaskInput, string>>;

/** One page of results plus the information needed to render pagination. */
export interface Page<T> {
  items: T[];
  /** Total number of matching items across all pages. */
  total: number;
  /** 1-based page number actually returned (clamped to the valid range). */
  page: number;
  pageSize: number;
  totalPages: number;
}
