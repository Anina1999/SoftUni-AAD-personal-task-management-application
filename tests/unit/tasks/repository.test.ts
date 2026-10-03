import { describe, expect, it } from "vitest";
import * as repository from "@/lib/tasks/repository";
import type { TaskInput } from "@/lib/tasks/types";
import { setTimestamps } from "../support/database";
import { taskInput } from "../support/tasks";

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** Inserts tasks oldest first, one day apart, and returns them. */
function insertDated(...titles: string[]) {
  return titles.map((title, index) => {
    const task = repository.insertTask(taskInput({ title, description: "" }));
    setTimestamps(task.id, `2026-01-${String(index + 1).padStart(2, "0")}T09:00:00.000Z`);
    return repository.findTaskById(task.id)!;
  });
}

describe("tasks repository", () => {
  describe("insertTask", () => {
    it("stores the task and returns it with an id and timestamps", () => {
      const task = repository.insertTask(taskInput({ title: "Buy milk", description: "2 litres" }));

      expect(task).toEqual({
        id: expect.any(Number),
        title: "Buy milk",
        description: "2 litres",
        priority: 3,
        dueDate: null,
        completedAt: null,
        createdAt: expect.stringMatching(ISO_TIMESTAMP),
        updatedAt: task.createdAt,
      });
      expect(repository.findTaskById(task.id)).toEqual(task);
    });

    it("is backed by the database's own checks if invalid input slips through", () => {
      expect(() => repository.insertTask(taskInput({ title: "   ", description: "" }))).toThrow(/CHECK/);
      expect(repository.countTasks()).toBe(0);
    });

    it("stores the priority and due date", () => {
      const task = repository.insertTask(taskInput({ priority: 1, dueDate: "2026-12-24" }));

      expect(task).toMatchObject({ priority: 1, dueDate: "2026-12-24" });
      expect(repository.findTaskById(task.id)).toEqual(task);
    });

    it.each([
      ["a priority out of range", { priority: 5 }],
      ["a fractional priority", { priority: 2.5 }],
      ["a due date that doesn't exist", { dueDate: "2026-02-30" }],
      ["a due date in another format", { dueDate: "24/12/2026" }],
    ])("rejects %s at the database level too", (_case, overrides) => {
      expect(() => repository.insertTask({ ...taskInput(), ...overrides } as TaskInput)).toThrow(/CHECK/);
      expect(repository.countTasks()).toBe(0);
    });
  });

  describe("setTaskCompleted", () => {
    it("records when the task was completed, without touching updatedAt", () => {
      const task = repository.insertTask(taskInput());

      const completed = repository.setTaskCompleted(task.id, true)!;

      expect(completed.completedAt).toMatch(ISO_TIMESTAMP);
      expect(completed).toEqual({ ...task, completedAt: completed.completedAt });
    });

    it("keeps the original completion time when completed again", () => {
      const task = repository.insertTask(taskInput());
      const first = repository.setTaskCompleted(task.id, true)!;

      expect(repository.setTaskCompleted(task.id, true)!.completedAt).toBe(first.completedAt);
    });

    it("clears the completion time when the task is reopened", () => {
      const task = repository.insertTask(taskInput());
      repository.setTaskCompleted(task.id, true);

      expect(repository.setTaskCompleted(task.id, false)).toEqual(task);
    });

    it("returns undefined for an id that doesn't exist", () => {
      expect(repository.setTaskCompleted(999, true)).toBeUndefined();
    });
  });

  describe("findTaskById", () => {
    it("returns undefined for an id that doesn't exist", () => {
      expect(repository.findTaskById(999)).toBeUndefined();
    });
  });

  describe("findTasks", () => {
    it("returns tasks newest first", () => {
      insertDated("oldest", "middle", "newest");

      const titles = repository.findTasks({ limit: 10, offset: 0 }).map((task) => task.title);
      expect(titles).toEqual(["newest", "middle", "oldest"]);
    });

    it("orders tasks created at the same moment by id, newest first", () => {
      const first = repository.insertTask(taskInput({ title: "first", description: "" }));
      const second = repository.insertTask(taskInput({ title: "second", description: "" }));
      setTimestamps(first.id, "2026-01-01T09:00:00.000Z");
      setTimestamps(second.id, "2026-01-01T09:00:00.000Z");

      const ids = repository.findTasks({ limit: 10, offset: 0 }).map((task) => task.id);
      expect(ids).toEqual([second.id, first.id]);
    });

    it("returns one slice at a time with limit and offset", () => {
      insertDated("t1", "t2", "t3", "t4", "t5");

      const titles = repository.findTasks({ limit: 2, offset: 2 }).map((task) => task.title);
      expect(titles).toEqual(["t3", "t2"]);
    });

    it("matches the search in the title or the description, ignoring case", () => {
      repository.insertTask(taskInput({ title: "Buy MILK", description: "" }));
      repository.insertTask(taskInput({ title: "Groceries", description: "oat milk and bread" }));
      repository.insertTask(taskInput({ title: "Call mum", description: "" }));

      const titles = repository.findTasks({ search: "milk", limit: 10, offset: 0 }).map((task) => task.title);
      expect(titles.sort()).toEqual(["Buy MILK", "Groceries"]);
    });

    it.each([
      ["%", "100% done", "1000 done"],
      ["_", "file_name", "filename"],
      ["\\", "C:\\temp", "C:temp"],
    ])("matches %s in the search literally, not as a wildcard", (_char, literal, lookalike) => {
      repository.insertTask(taskInput({ title: literal, description: "" }));
      repository.insertTask(taskInput({ title: lookalike, description: "" }));

      const search = literal.slice(0, literal.search(/[%_\\]/) + 1);
      const titles = repository.findTasks({ search, limit: 10, offset: 0 }).map((task) => task.title);
      expect(titles).toEqual([literal]);
    });
  });

  describe("countTasks", () => {
    it("counts all tasks, or only those matching a search", () => {
      repository.insertTask(taskInput({ title: "Buy milk", description: "" }));
      repository.insertTask(taskInput({ title: "Buy bread", description: "" }));
      repository.insertTask(taskInput({ title: "Call mum", description: "" }));

      expect(repository.countTasks()).toBe(3);
      expect(repository.countTasks("buy")).toBe(2);
      expect(repository.countTasks("nothing like this")).toBe(0);
    });
  });

  describe("updateTask", () => {
    it("changes the fields, bumps updatedAt and keeps createdAt", () => {
      const created = repository.insertTask(taskInput({ title: "Buy milk", description: "" }));
      setTimestamps(created.id, "2026-01-01T09:00:00.000Z");

      const updated = repository.updateTask(created.id, taskInput({ title: "Buy oat milk", description: "1 litre" }));

      expect(updated).toEqual({
        id: created.id,
        title: "Buy oat milk",
        description: "1 litre",
        priority: 3,
        dueDate: null,
        completedAt: null,
        createdAt: "2026-01-01T09:00:00.000Z",
        updatedAt: expect.stringMatching(ISO_TIMESTAMP),
      });
      expect(updated!.updatedAt > updated!.createdAt).toBe(true);
      expect(repository.findTaskById(created.id)).toEqual(updated);
    });

    it("sets and removes the priority and due date", () => {
      const created = repository.insertTask(taskInput());

      const planned = repository.updateTask(created.id, taskInput({ priority: 1, dueDate: "2026-12-24" }));
      expect(planned).toMatchObject({ priority: 1, dueDate: "2026-12-24" });

      const cleared = repository.updateTask(created.id, taskInput({ priority: 4, dueDate: null }));
      expect(cleared).toMatchObject({ priority: 4, dueDate: null });
      expect(repository.findTaskById(created.id)).toEqual(cleared);
    });

    it("returns undefined for an id that doesn't exist", () => {
      expect(repository.updateTask(999, taskInput({ title: "x", description: "" }))).toBeUndefined();
    });
  });

  describe("deleteTask", () => {
    it("removes the task and reports that it did", () => {
      const task = repository.insertTask(taskInput({ title: "Buy milk", description: "" }));

      expect(repository.deleteTask(task.id)).toBe(true);
      expect(repository.findTaskById(task.id)).toBeUndefined();
    });

    it("reports false when there was nothing to delete", () => {
      expect(repository.deleteTask(999)).toBe(false);
    });
  });
});
