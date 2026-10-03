/**
 * The in-memory database each unit test runs against. `tests/unit/setup.ts`
 * opens a fresh one before every test and points `getDb()` at it.
 */
import Database from "better-sqlite3";
import { runMigrations } from "@/lib/db/migrations";

let current: Database.Database | null = null;

/** Opens an empty database with the real schema (all migrations applied). */
export function openTestDb(): void {
  current = new Database(":memory:");
  runMigrations(current);
}

export function closeTestDb(): void {
  if (current?.open) current.close();
  current = null;
}

/** The current test's database, for arranging or inspecting rows directly. */
export function testDb(): Database.Database {
  if (!current) throw new Error("No test database is open.");
  return current;
}

/**
 * Overwrites a task's timestamps, e.g. to make it older than tasks created
 * later in the same millisecond.
 */
export function setTimestamps(id: number, createdAt: string, updatedAt = createdAt): void {
  testDb()
    .prepare("UPDATE tasks SET created_at = ?, updated_at = ? WHERE id = ?")
    .run(createdAt, updatedAt, id);
}
