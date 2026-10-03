/**
 * Tasks repository: the only module that contains SQL for the `tasks` table.
 *
 * - All queries are parameterised prepared statements (no string-built SQL),
 *   compiled once per connection and reused.
 * - Rows are mapped to the camelCase `Task` type via column aliases.
 * - Inputs are assumed to be already validated by the service layer; the
 *   database CHECK constraints act as a final safety net.
 * - Each write is a single statement, which SQLite executes atomically.
 */
import "server-only";
import type Database from "better-sqlite3";
import { getDb } from "@/lib/db/connection";
import type { Task, TaskInput } from "./types";

const TASK_COLUMNS = `
  id,
  title,
  description,
  priority,
  due_date AS dueDate,
  completed_at AS completedAt,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

/** `title`/`description` contain the search term (wildcards escaped). */
const SEARCH_CONDITION = `
  (title LIKE @pattern ESCAPE '\\' OR description LIKE @pattern ESCAPE '\\')
`;

function prepareStatements(db: Database.Database) {
  return {
    countAll: db.prepare<[], { total: number }>(
      `SELECT COUNT(*) AS total FROM tasks`,
    ),
    countSearch: db.prepare<{ pattern: string }, { total: number }>(
      `SELECT COUNT(*) AS total FROM tasks WHERE ${SEARCH_CONDITION}`,
    ),
    pageAll: db.prepare<{ limit: number; offset: number }, Task>(
      `SELECT ${TASK_COLUMNS} FROM tasks
       ORDER BY created_at DESC, id DESC
       LIMIT @limit OFFSET @offset`,
    ),
    pageSearch: db.prepare<
      { pattern: string; limit: number; offset: number },
      Task
    >(
      `SELECT ${TASK_COLUMNS} FROM tasks
       WHERE ${SEARCH_CONDITION}
       ORDER BY created_at DESC, id DESC
       LIMIT @limit OFFSET @offset`,
    ),
    findById: db.prepare<{ id: number }, Task>(
      `SELECT ${TASK_COLUMNS} FROM tasks WHERE id = @id`,
    ),
    insert: db.prepare<TaskInput, Task>(
      `INSERT INTO tasks (title, description, priority, due_date)
       VALUES (@title, @description, @priority, @dueDate)
       RETURNING ${TASK_COLUMNS}`,
    ),
    update: db.prepare<TaskInput & { id: number }, Task>(
      `UPDATE tasks
       SET title = @title, description = @description, priority = @priority,
           due_date = @dueDate, updated_at = ${NOW}
       WHERE id = @id
       RETURNING ${TASK_COLUMNS}`,
    ),
    // Keeps the original completion time if the task is already completed.
    // Not an edit of the task's content, so `updated_at` is left alone.
    setCompleted: db.prepare<{ id: number; completed: 0 | 1 }, Task>(
      `UPDATE tasks
       SET completed_at = CASE WHEN @completed = 1 THEN COALESCE(completed_at, ${NOW}) END
       WHERE id = @id
       RETURNING ${TASK_COLUMNS}`,
    ),
    remove: db.prepare<{ id: number }>(`DELETE FROM tasks WHERE id = @id`),
  };
}

type Statements = ReturnType<typeof prepareStatements>;
const statementCache = new WeakMap<Database.Database, Statements>();

/** Returns the prepared statements for the current connection. */
function statements(): Statements {
  const db = getDb();
  let cached = statementCache.get(db);
  if (!cached) {
    cached = prepareStatements(db);
    statementCache.set(db, cached);
  }
  return cached;
}

/** Escapes LIKE wildcards so user input is matched literally. */
function toLikePattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

/**
 * Returns a slice of tasks, newest first.
 *
 * @param options.search - Optional text to match in title or description.
 * @param options.limit - Maximum number of rows to return.
 * @param options.offset - Number of rows to skip.
 */
export function findTasks(options: {
  search?: string;
  limit: number;
  offset: number;
}): Task[] {
  const stmts = statements();
  const { search, limit, offset } = options;
  return search
    ? stmts.pageSearch.all({ pattern: toLikePattern(search), limit, offset })
    : stmts.pageAll.all({ limit, offset });
}

/** Counts tasks, optionally filtered by a search term. */
export function countTasks(search?: string): number {
  const stmts = statements();
  return search
    ? stmts.countSearch.get({ pattern: toLikePattern(search) })!.total
    : stmts.countAll.get()!.total;
}

/** Returns the task with the given id, or `undefined` if it doesn't exist. */
export function findTaskById(id: number): Task | undefined {
  return statements().findById.get({ id });
}

/** Inserts a task and returns the stored row (with id and timestamps). */
export function insertTask(input: TaskInput): Task {
  return statements().insert.get(input)!;
}

/**
 * Updates a task's editable fields and bumps `updatedAt`.
 * @returns The updated task, or `undefined` if no task has that id.
 */
export function updateTask(id: number, input: TaskInput): Task | undefined {
  return statements().update.get({ id, ...input });
}

/**
 * Marks a task as completed (keeping an earlier completion time) or as open.
 * Doesn't change `updatedAt`.
 * @returns The updated task, or `undefined` if no task has that id.
 */
export function setTaskCompleted(id: number, completed: boolean): Task | undefined {
  return statements().setCompleted.get({ id, completed: completed ? 1 : 0 });
}

/**
 * Deletes a task.
 * @returns `true` if a row was deleted, `false` if no task had that id.
 */
export function deleteTask(id: number): boolean {
  return statements().remove.run({ id }).changes > 0;
}
