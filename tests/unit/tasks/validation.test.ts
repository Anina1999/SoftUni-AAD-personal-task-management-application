import { describe, expect, it } from "vitest";
import { TASK_LIMITS, validateTaskInput } from "@/lib/tasks/validation";

describe("validateTaskInput", () => {
  it("accepts a valid task and trims both fields", () => {
    expect(validateTaskInput({ title: "  Buy milk  ", description: "  2 litres \n" })).toEqual({
      ok: true,
      value: { title: "Buy milk", description: "2 litres", priority: 3, dueDate: null },
    });
  });

  it("treats a missing description as empty", () => {
    expect(validateTaskInput({ title: "Buy milk" })).toEqual({
      ok: true,
      value: { title: "Buy milk", description: "", priority: 3, dueDate: null },
    });
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["only whitespace", "   \n\t "],
    ["not a string", 42],
  ])("requires a title (%s)", (_case, title) => {
    expect(validateTaskInput({ title })).toEqual({
      ok: false,
      errors: { title: "Title is required." },
    });
  });

  it("allows a title of exactly the maximum length", () => {
    const title = "a".repeat(TASK_LIMITS.titleMax);
    expect(validateTaskInput({ title })).toMatchObject({ ok: true, value: { title } });
  });

  it("rejects a title over the maximum length", () => {
    expect(validateTaskInput({ title: "a".repeat(TASK_LIMITS.titleMax + 1) })).toEqual({
      ok: false,
      errors: { title: "Title must be at most 200 characters." },
    });
  });

  it("allows a description of exactly the maximum length", () => {
    const description = "a".repeat(TASK_LIMITS.descriptionMax);
    expect(validateTaskInput({ title: "t", description })).toMatchObject({
      ok: true,
      value: { description },
    });
  });

  it("rejects a description over the maximum length", () => {
    expect(
      validateTaskInput({ title: "t", description: "a".repeat(TASK_LIMITS.descriptionMax + 1) }),
    ).toEqual({
      ok: false,
      errors: { description: "Description must be at most 5000 characters." },
    });
  });

  it("reports every invalid field at once", () => {
    const result = validateTaskInput({ title: "", description: "a".repeat(5001) });
    expect(result).toEqual({
      ok: false,
      errors: {
        title: "Title is required.",
        description: "Description must be at most 5000 characters.",
      },
    });
  });

  it("normalises Windows line endings before checking lengths", () => {
    // 5100 characters as typed, 3399 once \r\n becomes \n and the end is trimmed.
    const description = "a\r\n".repeat(1700);
    const result = validateTaskInput({ title: "t", description });
    expect(result).toEqual({
      ok: true,
      value: { title: "t", description: "a\n".repeat(1700).trimEnd(), priority: 3, dueDate: null },
    });
  });

  describe("priority", () => {
    it.each([1, 2, 3, 4])("accepts %i", (priority) => {
      expect(validateTaskInput({ title: "t", priority })).toMatchObject({ ok: true, value: { priority } });
    });

    it.each([
      ["missing", undefined],
      ["null", null],
    ])("defaults to 3 when %s", (_case, priority) => {
      expect(validateTaskInput({ title: "t", priority })).toMatchObject({ ok: true, value: { priority: 3 } });
    });

    it.each([
      ["below the range", 0],
      ["above the range", 5],
      ["not a whole number", 2.5],
      ["a numeric string", "2"],
      ["a boolean", true],
    ])("rejects a priority that is %s", (_case, priority) => {
      expect(validateTaskInput({ title: "t", priority })).toEqual({
        ok: false,
        errors: { priority: "Priority must be 1, 2, 3 or 4." },
      });
    });
  });

  describe("due date", () => {
    it("accepts a calendar date as YYYY-MM-DD, including 29 February in a leap year", () => {
      expect(validateTaskInput({ title: "t", dueDate: "2026-10-31" })).toMatchObject({
        ok: true,
        value: { dueDate: "2026-10-31" },
      });
      expect(validateTaskInput({ title: "t", dueDate: "2028-02-29" })).toMatchObject({
        ok: true,
        value: { dueDate: "2028-02-29" },
      });
    });

    it("trims surrounding whitespace", () => {
      expect(validateTaskInput({ title: "t", dueDate: " 2026-10-31 " })).toMatchObject({
        ok: true,
        value: { dueDate: "2026-10-31" },
      });
    });

    it.each([
      ["missing", undefined],
      ["null", null],
      ["an empty string", ""],
      ["only whitespace", "  "],
    ])("means no due date when %s", (_case, dueDate) => {
      expect(validateTaskInput({ title: "t", dueDate })).toMatchObject({ ok: true, value: { dueDate: null } });
    });

    it.each([
      ["a day that doesn't exist", "2026-02-30"],
      ["29 February outside a leap year", "2027-02-29"],
      ["month 13", "2026-13-01"],
      ["without zero padding", "2026-1-5"],
      ["in another format", "31/10/2026"],
      ["a timestamp", "2026-10-31T09:00:00Z"],
      ["a word", "tomorrow"],
      ["a number", 20261031],
    ])("rejects a due date that is %s", (_case, dueDate) => {
      expect(validateTaskInput({ title: "t", dueDate })).toEqual({
        ok: false,
        errors: { dueDate: "Due date must be a valid date (YYYY-MM-DD)." },
      });
    });
  });
});
