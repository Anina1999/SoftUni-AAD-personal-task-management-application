/**
 * Stubs for the tasks JSON API (`/api/tasks`, see `src/lib/tasks/api-client.ts`).
 *
 * Each helper answers one endpoint with `cy.intercept` and aliases the route,
 * so a spec can `cy.wait("@createTask")` and inspect the request the
 * component sent. Stubs are reset before every test.
 */
import type { RouteHandler, StaticResponse } from "cypress/types/net-stubbing";
import type { Task, TaskFieldErrors } from "@/lib/tasks/types";

/** A task as the API returns it; override only the fields a test cares about. */
export function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: "Buy milk",
    description: "2 litres, semi-skimmed",
    priority: 3,
    dueDate: null,
    createdAt: "2026-10-01T09:00:00.000Z",
    updatedAt: "2026-10-01T09:00:00.000Z",
    ...overrides,
  };
}

/** An error response shaped like the real API's: `{ error, errors? }`. */
export function apiError(statusCode: number, error: string, errors?: TaskFieldErrors): StaticResponse {
  return { statusCode, body: errors ? { error, errors } : { error } };
}

/** Stubs `POST /api/tasks` as `@createTask`. */
export function stubCreateTask(response: RouteHandler) {
  return cy.intercept("POST", "/api/tasks", response).as("createTask");
}

/** Stubs `PATCH /api/tasks/:id` as `@updateTask`. */
export function stubUpdateTask(id: number, response: RouteHandler) {
  return cy.intercept("PATCH", `/api/tasks/${id}`, response).as("updateTask");
}

/** Stubs `DELETE /api/tasks/:id` as `@deleteTask`. */
export function stubDeleteTask(id: number, response: RouteHandler) {
  return cy.intercept("DELETE", `/api/tasks/${id}`, response).as("deleteTask");
}

/**
 * A response that is held back until `release()` is called, so a test can
 * check the pending UI deterministically, without timing-based delays.
 */
export function heldResponse(response: StaticResponse) {
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const handler: RouteHandler = (request) => released.then(() => request.reply(response));
  return { handler, release: () => release() };
}
