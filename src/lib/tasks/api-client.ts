/**
 * Browser-side client for the tasks JSON API (`/api/tasks`), used by the
 * task dialogs.
 *
 * Functions never throw: they resolve to a result object, so callers can show
 * the error inline. A network failure is reported with `status: 0`.
 *
 * Safe to import from client components (no server-only code).
 */
import type { Task, TaskFieldErrors, TaskInput } from "./types";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; errors?: TaskFieldErrors };

const NETWORK_ERROR = "Could not reach the server. Check your connection and try again.";
const UNEXPECTED_RESPONSE = "The server sent an unexpected response. Please try again.";

async function request<T>(path: string, init: RequestInit): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: init.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    return { ok: false, status: 0, error: NETWORK_ERROR };
  }

  if (response.status === 204) return { ok: true, data: undefined as T };

  const body = await response.json().catch(() => null);
  if (response.ok && body !== null) return { ok: true, data: body as T };
  return {
    ok: false,
    status: response.status,
    error: typeof body?.error === "string" ? body.error : UNEXPECTED_RESPONSE,
    errors: body?.errors,
  };
}

/** Creates a task. */
export function createTask(input: TaskInput): Promise<ApiResult<Task>> {
  return request("/api/tasks", { method: "POST", body: JSON.stringify(input) });
}

/** Updates a task; fields left out keep their current value. */
export function updateTask(id: number, input: Partial<TaskInput>): Promise<ApiResult<Task>> {
  return request(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

/** Deletes a task. A 404 means it was already gone. */
export function deleteTask(id: number): Promise<ApiResult<void>> {
  return request(`/api/tasks/${id}`, { method: "DELETE" });
}
