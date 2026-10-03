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

/** Ordered list of migrations. Index 0 upgrades version 0 -> 1, and so on. */
const MIGRATIONS: readonly string[] = [
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
