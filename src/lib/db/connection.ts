/**
 * SQLite connection management.
 *
 * Exposes a single, lazily-created connection per Node.js process. The
 * connection is cached on `globalThis` so that Next.js dev-mode hot reloads
 * reuse it instead of opening a new handle on every code change.
 *
 * Durability / safety settings:
 *  - `journal_mode = WAL`   readers never block the writer; crash-safe.
 *  - `synchronous = FULL`   a committed transaction survives power loss.
 *  - `busy_timeout = 5000`  wait for locks instead of failing immediately.
 *  - `foreign_keys = ON`    enforce relations once future tables add them.
 *
 * The database file location defaults to `./data/tasks.db` and can be
 * overridden with the `DATABASE_PATH` environment variable.
 */
import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { runMigrations } from "./migrations";

const DATABASE_PATH =
  process.env.DATABASE_PATH || path.join(process.cwd(), "data", "tasks.db");

const globalForDb = globalThis as typeof globalThis & {
  __taskDb?: Database.Database;
};

/** Opens the database file, applies PRAGMAs and migrations. */
function openDatabase(): Database.Database {
  fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });

  const db = new Database(DATABASE_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = FULL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");

  runMigrations(db);
  registerShutdownHooks(db);
  return db;
}

/**
 * Closes the connection cleanly when the process exits.
 *
 * Next.js already handles SIGINT/SIGTERM by calling `process.exit()`, which
 * fires the `exit` event, so hooking `exit` covers Ctrl+C and normal shutdown
 * without overriding the framework's own signal handling.
 */
function registerShutdownHooks(db: Database.Database): void {
  process.once("exit", () => {
    if (db.open) db.close();
  });
}

/**
 * Returns the shared database connection, opening it on first use.
 *
 * @returns The process-wide better-sqlite3 connection.
 */
export function getDb(): Database.Database {
  if (!globalForDb.__taskDb) {
    globalForDb.__taskDb = openDatabase();
  }
  return globalForDb.__taskDb;
}
