/**
 * Validation rules for task input.
 *
 * This is the single source of truth for task limits: the service layer uses
 * `validateTaskInput` before writing, and the form uses `TASK_LIMITS` for
 * `maxLength` attributes and character counters, and `TASK_PRIORITIES` for
 * its priority options. The database enforces the same rules again with CHECK
 * constraints (see `lib/db/migrations.ts`).
 *
 * Safe to import from both server and client code.
 */
import type { TaskFieldErrors, TaskInput, TaskPriority } from "./types";

export const TASK_LIMITS = {
  titleMax: 200,
  descriptionMax: 5000,
} as const;

/** Every priority, most important first. */
export const TASK_PRIORITIES: readonly TaskPriority[] = [1, 2, 3, 4];

/** Priority a task gets when none is given. */
export const DEFAULT_PRIORITY: TaskPriority = 3;

/** Untrusted task input, e.g. a parsed JSON request body. */
export type RawTaskInput = { [Field in keyof TaskInput]?: unknown };

export type ValidationResult =
  | { ok: true; value: TaskInput }
  | { ok: false; errors: TaskFieldErrors };

/**
 * Normalises and validates raw task input.
 *
 * - The title is trimmed and must be 1..`titleMax` characters long.
 * - The description is trimmed and may be empty, up to `descriptionMax`.
 * - Windows line endings are normalised to `\n` so lengths are consistent.
 * - The priority is an integer from 1 (most important) to 4; missing or
 *   `null` means `DEFAULT_PRIORITY`.
 * - The due date is a real calendar date as `YYYY-MM-DD`; missing, `null` or
 *   an empty string means "no due date" (`null`).
 *
 * @param raw - Untrusted values (e.g. from a submitted form).
 * @returns The cleaned input, or field-level error messages.
 */
export function validateTaskInput(raw: RawTaskInput): ValidationResult {
  const title = normalise(raw.title);
  const description = normalise(raw.description);
  const priority = raw.priority ?? DEFAULT_PRIORITY;
  const dueDate = typeof raw.dueDate === "string" ? raw.dueDate.trim() || null : (raw.dueDate ?? null);
  const errors: TaskFieldErrors = {};

  if (title.length === 0) {
    errors.title = "Title is required.";
  } else if (title.length > TASK_LIMITS.titleMax) {
    errors.title = `Title must be at most ${TASK_LIMITS.titleMax} characters.`;
  }

  if (description.length > TASK_LIMITS.descriptionMax) {
    errors.description = `Description must be at most ${TASK_LIMITS.descriptionMax} characters.`;
  }

  if (!isPriority(priority)) {
    errors.priority = "Priority must be 1, 2, 3 or 4.";
  }

  if (dueDate !== null && !isCalendarDate(dueDate)) {
    errors.dueDate = "Due date must be a valid date (YYYY-MM-DD).";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  // Both were checked above; the type guards can't carry that past `errors`.
  return {
    ok: true,
    value: { title, description, priority: priority as TaskPriority, dueDate: dueDate as string | null },
  };
}

function normalise(value: unknown): string {
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : "";
}

function isPriority(value: unknown): value is TaskPriority {
  return TASK_PRIORITIES.includes(value as TaskPriority);
}

/** `true` for an existing date written as `YYYY-MM-DD` (rejects e.g. `2026-02-30`). */
function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}
