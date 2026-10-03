/**
 * Single-task endpoint.
 *
 *   GET    /api/tasks/:id                    200 → Task
 *   PATCH  /api/tasks/:id  { title?, description?, priority?, dueDate? }
 *                                            200 → Task (omitted fields keep their value;
 *                                                  `dueDate: null` removes the due date)
 *                                            400 → { error, errors } on invalid input
 *   DELETE /api/tasks/:id                    204
 *
 * An id that isn't a positive integer, or that matches no task, gets a 404.
 */
import type { NextRequest } from "next/server";
import { errorResponse, handle, readJsonObject } from "@/app/api/http";
import * as tasks from "@/lib/tasks/service";

type Context = RouteContext<"/api/tasks/[id]">;

const notFound = () => errorResponse(404, "Task not found. It may have been deleted.");

async function taskIdFrom(context: Context): Promise<number | null> {
  const { id } = await context.params;
  return tasks.parseTaskId(id);
}

export const GET = handle(async (_request: NextRequest, context: Context) => {
  const id = await taskIdFrom(context);
  const task = id === null ? undefined : tasks.getTask(id);
  return task ? Response.json(task) : notFound();
});

export const PATCH = handle(async (request: NextRequest, context: Context) => {
  const id = await taskIdFrom(context);
  if (id === null) return notFound();

  const input = await readJsonObject(request);
  if (!input.ok) return input.response;

  const result = tasks.updateTask(id, input.body);
  if (!result) return notFound();
  if (!result.ok) return errorResponse(400, "The task is not valid.", result.errors);
  return Response.json(result.task);
});

export const DELETE = handle(async (_request: NextRequest, context: Context) => {
  const id = await taskIdFrom(context);
  if (id === null || !tasks.deleteTask(id)) return notFound();
  return new Response(null, { status: 204 });
});
