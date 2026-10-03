/**
 * Versioned, forward-only schema migrations.
 *
 * The current schema version is stored in SQLite's built-in
 * `PRAGMA user_version`. On startup, every migration whose index is >= that
 * version is applied in order, each inside its own transaction, so a failed
 * migration never leaves the schema half-changed.
 *
 * Rules for adding a migration:
 *  - Append a new entry to `MIGRATIONS`; never edit or reorder existing ones.
 *  - Prefer additive changes (new tables/columns with defaults) so existing
 *    data is preserved.
 */
import "server-only";
import type Database from "better-sqlite3";

/**
 * Ordered list of migrations. Index 0 upgrades version 0 -> 1, and so on.
 * Exported so tests can build a database at an older version.
 */
export const MIGRATIONS: readonly string[] = [
  // v1: tasks table
  `
  CREATE TABLE tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
    description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 5000),
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE INDEX idx_tasks_created_at ON tasks (created_at DESC, id DESC);
  `,
  // v2: optional priority (1 = most important, default 3) and due date (YYYY-MM-DD).
  // `date(x) IS x` only holds for a real date already written as YYYY-MM-DD.
  `
  ALTER TABLE tasks ADD COLUMN priority INTEGER NOT NULL DEFAULT 3
    CHECK (priority IN (1, 2, 3, 4));
  ALTER TABLE tasks ADD COLUMN due_date TEXT
    CHECK (due_date IS NULL OR date(due_date) IS due_date);
  `,
];

/**
 * Brings the database schema up to the latest version.
 *
 * @param db - An open better-sqlite3 connection.
 * @throws If a migration fails; that migration's transaction is rolled back.
 */
export function runMigrations(db: Database.Database): void {
  const currentVersion = db.pragma("user_version", { simple: true }) as number;

  for (let version = currentVersion; version < MIGRATIONS.length; version++) {
    const applyMigration = db.transaction(() => {
      db.exec(MIGRATIONS[version]);
      // PRAGMA does not accept bound parameters; `version` is a trusted integer.
      db.pragma(`user_version = ${version + 1}`);
    });
    applyMigration();
  }
}
