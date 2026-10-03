/**
 * The `/api/tasks` route handlers, called directly with real requests and
 * backed by the real service and repository (on the test's in-memory
 * database). These pin down the responses the browser client relies on, and
 * that the Cypress component tests stub.
 */
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as collection from "@/app/api/tasks/route";
import * as item from "@/app/api/tasks/[id]/route";
import * as repository from "@/lib/tasks/repository";
import { testDb } from "../support/database";
import { taskInput } from "../support/tasks";

const BASE_URL = "http://localhost/api/tasks";
const NOT_FOUND = { error: "Task not found. It may have been deleted." };

function jsonRequest(url: string, method: string, body: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

// The collection handlers take no route params, so their context is unused.
const listTasks = (query = "") => collection.GET(new NextRequest(`${BASE_URL}${query}`), undefined);
const postTask = (body: unknown) => collection.POST(jsonRequest(BASE_URL, "POST", body), undefined);
const getTask = (id: string) => item.GET(new NextRequest(`${BASE_URL}/${id}`), params(id));
const patchTask = (id: string, body: unknown) =>
  item.PATCH(jsonRequest(`${BASE_URL}/${id}`, "PATCH", body), params(id));
const deleteTask = (id: string) =>
  item.DELETE(new NextRequest(`${BASE_URL}/${id}`, { method: "DELETE" }), params(id));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/tasks", () => {
  it("creates the task: 201, the stored task and its Location", async () => {
    const response = await postTask({ title: "  Buy milk ", description: "2 litres" });
    const task = await response.json();

    expect(response.status).toBe(201);
    expect(task).toMatchObject({ id: expect.any(Number), title: "Buy milk", description: "2 litres" });
    expect(response.headers.get("Location")).toBe(`/api/tasks/${task.id}`);
    expect(repository.findTaskById(task.id)).toEqual(task);
  });

  it("defaults to priority 3 and no due date when they are left out", async () => {
    const task = await (await postTask({ title: "Buy milk" })).json();

    expect(task).toMatchObject({ priority: 3, dueDate: null });
  });

  it("stores the priority and due date that are sent", async () => {
    const response = await postTask({ title: "Book flights", priority: 1, dueDate: "2026-12-24" });
    const task = await response.json();

    expect(response.status).toBe(201);
    expect(task).toMatchObject({ priority: 1, dueDate: "2026-12-24" });
    expect(repository.findTaskById(task.id)).toEqual(task);
  });

  it("rejects an invalid priority or due date with 400 and field errors", async () => {
    const response = await postTask({ title: "Buy milk", priority: 0, dueDate: "2026-02-30" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "The task is not valid.",
      errors: {
        priority: "Priority must be 1, 2, 3 or 4.",
        dueDate: "Due date must be a valid date (YYYY-MM-DD).",
      },
    });
    expect(repository.countTasks()).toBe(0);
  });

  it("rejects invalid input with 400 and field errors", async () => {
    const response = await postTask({ title: "", description: "a".repeat(5001) });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "The task is not valid.",
      errors: {
        title: "Title is required.",
        description: "Description must be at most 5000 characters.",
      },
    });
    expect(repository.countTasks()).toBe(0);
  });

  it("rejects a body that isn't sent as JSON with 415 (blocks cross-site form posts)", async () => {
    const response = await collection.POST(
      new NextRequest(BASE_URL, { method: "POST", body: "title=Buy+milk" }),
      undefined,
    );

    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({
      error: "Send the request body as JSON (Content-Type: application/json).",
    });
    expect(repository.countTasks()).toBe(0);
  });

  it.each([
    ["malformed JSON", "{ title: ", "The request body is not valid JSON."],
    ["a JSON array", "[]", "The request body must be a JSON object."],
    ["JSON null", "null", "The request body must be a JSON object."],
  ])("rejects %s with 400", async (_case, body, error) => {
    const response = await postTask(body);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error });
  });
});

describe("GET /api/tasks", () => {
  it("returns the first page, newest first", async () => {
    const older = repository.insertTask(taskInput({ title: "Older", description: "" }));
    const newer = repository.insertTask(taskInput({ title: "Newer", description: "" }));

    const response = await listTasks();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [newer, older],
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
  });

  it("applies the search, page and page size from the query string", async () => {
    for (let i = 1; i <= 5; i++) repository.insertTask(taskInput({ title: `Buy item ${i}`, description: "" }));
    repository.insertTask(taskInput({ title: "Call mum", description: "" }));

    const body = await (await listTasks("?q=buy&page=2&pageSize=2")).json();

    expect(body).toMatchObject({ total: 5, page: 2, pageSize: 2, totalPages: 3 });
    expect(body.items.map((task: { title: string }) => task.title)).toEqual(["Buy item 3", "Buy item 2"]);
  });
});

describe("GET /api/tasks/:id", () => {
  it("returns the task", async () => {
    const task = repository.insertTask(taskInput({ title: "Buy milk", description: "" }));

    const response = await getTask(String(task.id));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(task);
  });

  it.each(["999", "abc", "0"])("answers 404 for id %j", async (id) => {
    const response = await getTask(id);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(NOT_FOUND);
  });
});

describe("PATCH /api/tasks/:id", () => {
  it("updates only the fields that are sent", async () => {
    const task = repository.insertTask(taskInput({ title: "Buy milk", description: "2 litres" }));

    const response = await patchTask(String(task.id), { title: "Buy oat milk" });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      id: task.id,
      title: "Buy oat milk",
      description: "2 litres",
    });
  });

  it("changes the priority and due date, and removes the due date when it is null", async () => {
    const task = repository.insertTask(taskInput({ title: "Book flights", priority: 1, dueDate: "2026-12-24" }));

    const changed = await patchTask(String(task.id), { priority: 2, dueDate: "2027-01-15" });
    expect(await changed.json()).toMatchObject({ title: "Book flights", priority: 2, dueDate: "2027-01-15" });

    const cleared = await patchTask(String(task.id), { dueDate: null });
    expect(cleared.status).toBe(200);
    expect(await cleared.json()).toMatchObject({ priority: 2, dueDate: null });
  });

  it("rejects invalid input with 400 and leaves the task unchanged", async () => {
    const task = repository.insertTask(taskInput({ title: "Buy milk", description: "" }));

    const response = await patchTask(String(task.id), { title: "   " });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "The task is not valid.",
      errors: { title: "Title is required." },
    });
    expect(repository.findTaskById(task.id)).toEqual(task);
  });

  it("marks the task as completed and reopens it", async () => {
    const task = repository.insertTask(taskInput({ title: "Buy milk" }));

    const completed = await patchTask(String(task.id), { completed: true });
    expect(completed.status).toBe(200);
    expect(await completed.json()).toMatchObject({ title: "Buy milk", completedAt: expect.any(String) });

    const reopened = await patchTask(String(task.id), { completed: false });
    expect(await reopened.json()).toEqual(task);
  });

  it("rejects a completed value that isn't a boolean with 400", async () => {
    const task = repository.insertTask(taskInput());

    const response = await patchTask(String(task.id), { completed: "yes" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "The task is not valid.",
      errors: { completed: "Completed must be true or false." },
    });
  });

  it.each(["999", "abc"])("answers 404 for id %j", async (id) => {
    const response = await patchTask(id, { title: "x" });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(NOT_FOUND);
  });

  it("rejects a body that isn't sent as JSON with 415", async () => {
    const task = repository.insertTask(taskInput({ title: "Buy milk", description: "" }));

    const response = await item.PATCH(
      new NextRequest(`${BASE_URL}/${task.id}`, { method: "PATCH", body: "title=x" }),
      params(String(task.id)),
    );

    expect(response.status).toBe(415);
    expect(repository.findTaskById(task.id)).toEqual(task);
  });
});

describe("DELETE /api/tasks/:id", () => {
  it("deletes the task: 204 with no body", async () => {
    const task = repository.insertTask(taskInput({ title: "Buy milk", description: "" }));

    const response = await deleteTask(String(task.id));

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(repository.findTaskById(task.id)).toBeUndefined();
  });

  it("answers 404 when the task is already gone", async () => {
    const task = repository.insertTask(taskInput({ title: "Buy milk", description: "" }));
    await deleteTask(String(task.id));

    const response = await deleteTask(String(task.id));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(NOT_FOUND);
  });
});

describe("unexpected errors", () => {
  it("are logged and answered with a JSON 500 instead of an HTML error page", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    testDb().close();

    const response = await listTasks();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Something went wrong on the server. Please try again.",
    });
    expect(log).toHaveBeenCalledWith("GET /api/tasks failed", expect.any(Error));
  });
});
