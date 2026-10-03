import { describe, expect, it } from "vitest";
import * as repository from "@/lib/tasks/repository";
import * as service from "@/lib/tasks/service";
import { taskInput } from "../support/tasks";

/** Inserts `count` tasks straight into the database. */
function seed(count: number) {
  for (let i = 1; i <= count; i++) repository.insertTask(taskInput({ title: `Task ${i}`, description: "" }));
}

describe("tasks service", () => {
  describe("parseTaskId", () => {
    it("accepts a positive integer", () => {
      expect(service.parseTaskId("7")).toBe(7);
      expect(service.parseTaskId("1234567890")).toBe(1234567890);
    });

    it.each(["0", "-1", "1.5", "007", "abc", "7abc", "", " 7", "99999999999999999"])(
      "rejects %j",
      (raw) => {
        expect(service.parseTaskId(raw)).toBeNull();
      },
    );

    it("rejects anything that isn't a string", () => {
      expect(service.parseTaskId(7)).toBeNull();
      expect(service.parseTaskId(undefined)).toBeNull();
    });
  });

  describe("normaliseSearch", () => {
    it("trims the term and caps it at 200 characters", () => {
      expect(service.normaliseSearch("  milk  ")).toBe("milk");
      expect(service.normaliseSearch("a".repeat(250))).toHaveLength(200);
    });

    it("returns an empty string for anything that isn't a string", () => {
      expect(service.normaliseSearch(undefined)).toBe("");
      expect(service.normaliseSearch(["milk"])).toBe("");
    });
  });

  describe("listTasks", () => {
    it("returns the first page of 20 by default", () => {
      seed(45);

      const page = service.listTasks({});
      expect(page).toMatchObject({ total: 45, page: 1, pageSize: 20, totalPages: 3 });
      expect(page.items).toHaveLength(20);
    });

    it("returns the requested page", () => {
      seed(45);

      const page = service.listTasks({ page: 3 });
      expect(page.page).toBe(3);
      expect(page.items).toHaveLength(5);
    });

    it("clamps a page that is out of range", () => {
      seed(45);

      expect(service.listTasks({ page: 99 }).page).toBe(3);
      expect(service.listTasks({ page: 0 }).page).toBe(1);
      expect(service.listTasks({ page: Number.NaN }).page).toBe(1);
    });

    it("clamps the page size to 1..100", () => {
      seed(3);

      expect(service.listTasks({ pageSize: 500 }).pageSize).toBe(100);
      expect(service.listTasks({ pageSize: 0 }).pageSize).toBe(1);
    });

    it("reports one empty page when there are no tasks", () => {
      expect(service.listTasks({})).toEqual({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });
    });

    it("filters by the trimmed search term", () => {
      repository.insertTask(taskInput({ title: "Buy milk", description: "" }));
      repository.insertTask(taskInput({ title: "Call mum", description: "" }));

      const page = service.listTasks({ search: "  milk " });
      expect(page.total).toBe(1);
      expect(page.items[0].title).toBe("Buy milk");
    });
  });

  describe("createTask", () => {
    it("validates, then stores the cleaned-up task", () => {
      const result = service.createTask({ title: "  Buy milk ", description: " 2 litres " });

      expect(result).toMatchObject({ ok: true, task: { title: "Buy milk", description: "2 litres" } });
      expect(repository.countTasks()).toBe(1);
    });

    it("stores nothing when the input is invalid", () => {
      expect(service.createTask({ title: "" })).toEqual({
        ok: false,
        errors: { title: "Title is required." },
      });
      expect(repository.countTasks()).toBe(0);
    });

    it("gives a task without a priority or due date priority 3 and no due date", () => {
      expect(service.createTask({ title: "Buy milk" })).toMatchObject({
        ok: true,
        task: { priority: 3, dueDate: null },
      });
    });

    it("stores the given priority and due date", () => {
      expect(service.createTask({ title: "Book flights", priority: 1, dueDate: "2026-12-24" })).toMatchObject({
        ok: true,
        task: { priority: 1, dueDate: "2026-12-24" },
      });
    });
  });

  describe("updateTask", () => {
    it("keeps the priority and due date when they are left out", () => {
      const task = repository.insertTask(taskInput({ priority: 1, dueDate: "2026-12-24" }));

      expect(service.updateTask(task.id, { title: "Book trains" })).toMatchObject({
        ok: true,
        task: { title: "Book trains", priority: 1, dueDate: "2026-12-24" },
      });
    });

    it("changes the priority and due date, and removes the due date when it is null", () => {
      const task = repository.insertTask(taskInput());

      expect(service.updateTask(task.id, { priority: 2, dueDate: "2027-01-15" })).toMatchObject({
        ok: true,
        task: { priority: 2, dueDate: "2027-01-15" },
      });
      expect(service.updateTask(task.id, { dueDate: null })).toMatchObject({
        ok: true,
        task: { priority: 2, dueDate: null },
      });
    });

    it("leaves the task unchanged when the priority or due date is invalid", () => {
      const task = repository.insertTask(taskInput({ priority: 1, dueDate: "2026-12-24" }));

      expect(service.updateTask(task.id, { priority: 9, dueDate: "soon" })).toEqual({
        ok: false,
        errors: {
          priority: "Priority must be 1, 2, 3 or 4.",
          dueDate: "Due date must be a valid date (YYYY-MM-DD).",
        },
      });
      expect(repository.findTaskById(task.id)).toEqual(task);
    });

    it("keeps the fields that are left out", () => {
      const task = repository.insertTask(taskInput({ title: "Buy milk", description: "2 litres" }));

      expect(service.updateTask(task.id, { title: "Buy oat milk" })).toMatchObject({
        ok: true,
        task: { title: "Buy oat milk", description: "2 litres" },
      });
      expect(service.updateTask(task.id, { description: "" })).toMatchObject({
        ok: true,
        task: { title: "Buy oat milk", description: "" },
      });
    });

    it("leaves the task unchanged when the input is invalid", () => {
      const task = repository.insertTask(taskInput({ title: "Buy milk", description: "" }));

      expect(service.updateTask(task.id, { title: "  " })).toEqual({
        ok: false,
        errors: { title: "Title is required." },
      });
      expect(repository.findTaskById(task.id)).toEqual(task);
    });

    it("returns undefined for a task that doesn't exist", () => {
      expect(service.updateTask(999, { title: "x" })).toBeUndefined();
    });
  });

  describe("deleteTask", () => {
    it("reports whether a task was deleted", () => {
      const task = repository.insertTask(taskInput({ title: "Buy milk", description: "" }));

      expect(service.deleteTask(task.id)).toBe(true);
      expect(service.deleteTask(task.id)).toBe(false);
    });
  });
});
