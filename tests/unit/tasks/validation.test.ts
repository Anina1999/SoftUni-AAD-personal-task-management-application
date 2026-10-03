import { describe, expect, it } from "vitest";
import { TASK_LIMITS, validateTaskInput } from "@/lib/tasks/validation";

describe("validateTaskInput", () => {
  it("accepts a valid task and trims both fields", () => {
    expect(validateTaskInput({ title: "  Buy milk  ", description: "  2 litres \n" })).toEqual({
      ok: true,
      value: { title: "Buy milk", description: "2 litres" },
    });
  });

  it("treats a missing description as empty", () => {
    expect(validateTaskInput({ title: "Buy milk" })).toEqual({
      ok: true,
      value: { title: "Buy milk", description: "" },
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
      value: { title: "t", description: "a\n".repeat(1700).trimEnd() },
    });
  });
});
