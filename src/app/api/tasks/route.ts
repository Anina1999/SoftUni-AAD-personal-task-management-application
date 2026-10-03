/**
 * Tasks collection endpoint.
 *
 *   GET  /api/tasks?q=&page=&pageSize=   200 → Page<Task> (newest first)
 *   POST /api/tasks  { title, description?, priority?, dueDate? }
 *                                        201 → Task (with a Location header)
 *                                        400 → { error, errors } on invalid input
 *
 * `page` is clamped to the valid range; `pageSize` defaults to 20 (max 100).
 * `priority` is 1 (most important) to 4, default 3; `dueDate` is `YYYY-MM-DD`
 * or `null` (the default).
 */
import type { NextRequest } from "next/server";
import { errorResponse, handle, readJsonObject } from "@/app/api/http";
import * as tasks from "@/lib/tasks/service";

export const GET = handle(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const page = tasks.listTasks({
    search: params.get("q") ?? undefined,
    page: Number(params.get("page") ?? 1),
    pageSize: Number(params.get("pageSize") ?? tasks.PAGE_SIZE),
  });
  return Response.json(page);
});

export const POST = handle(async (request: NextRequest) => {
  const input = await readJsonObject(request);
  if (!input.ok) return input.response;

  const result = tasks.createTask(input.body);
  if (!result.ok) return errorResponse(400, "The task is not valid.", result.errors);

  return Response.json(result.task, {
    status: 201,
    headers: { Location: `/api/tasks/${result.task.id}` },
  });
});
