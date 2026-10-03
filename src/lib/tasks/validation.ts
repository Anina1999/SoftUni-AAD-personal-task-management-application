/**
 * Validation rules for task input.
 *
 * This is the single source of truth for task limits: the service layer uses
 * `validateTaskInput` before writing, and the form uses `TASK_LIMITS` for
 * `maxLength` attributes and character counters. The database enforces the
 * same limits again with CHECK constraints (see `lib/db/migrations.ts`).
 *
 * Safe to import from both server and client code.
 */
import type { TaskFieldErrors, TaskInput } from "./types";

export const TASK_LIMITS = {
  titleMax: 200,
  descriptionMax: 5000,
} as const;

export type ValidationResult =
  | { ok: true; value: TaskInput }
  | { ok: false; errors: TaskFieldErrors };

/**
 * Normalises and validates raw task input.
 *
 * - The title is trimmed and must be 1..`titleMax` characters long.
 * - The description is trimmed and may be empty, up to `descriptionMax`.
 * - Windows line endings are normalised to `\n` so lengths are consistent.
 *
 * @param raw - Untrusted values (e.g. from a submitted form).
 * @returns The cleaned input, or field-level error messages.
 */
export function validateTaskInput(raw: {
  title?: unknown;
  description?: unknown;
}): ValidationResult {
  const title = normalise(raw.title);
  const description = normalise(raw.description);
  const errors: TaskFieldErrors = {};

  if (title.length === 0) {
    errors.title = "Title is required.";
  } else if (title.length > TASK_LIMITS.titleMax) {
    errors.title = `Title must be at most ${TASK_LIMITS.titleMax} characters.`;
  }

  if (description.length > TASK_LIMITS.descriptionMax) {
    errors.description = `Description must be at most ${TASK_LIMITS.descriptionMax} characters.`;
  }

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, value: { title, description } };
}

function normalise(value: unknown): string {
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : "";
}
