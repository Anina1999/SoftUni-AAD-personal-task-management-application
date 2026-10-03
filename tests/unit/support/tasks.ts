/**
 * Complete task input for writing straight to the repository, which (unlike
 * the service) expects every field. Override only the fields a test cares about.
 */
import type { TaskInput } from "@/lib/tasks/types";

export function taskInput(overrides: Partial<TaskInput> = {}): TaskInput {
  return { title: "Buy milk", description: "", priority: 3, dueDate: null, ...overrides };
}
