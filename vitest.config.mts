/**
 * Vitest unit tests for the server side: validation, service, repository and
 * the `/api/tasks` route handlers. Tests live in `tests/unit/`.
 *
 * Every test runs against its own in-memory SQLite database (see
 * `tests/unit/setup.ts`), so tests never touch `data/tasks.db` and never see
 * each other's data.
 */
import path from "node:path";
import { defineConfig } from "vitest/config";

const fromRoot = (relative: string) => path.resolve(import.meta.dirname, relative);

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${fromRoot("src")}/` },
      // `server-only` throws outside a React Server Components bundle; tests run in plain Node.
      { find: /^server-only$/, replacement: fromRoot("node_modules/server-only/empty.js") },
    ],
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/unit/setup.ts"],
    // Worker threads start faster than child processes (the default), notably on Windows.
    pool: "threads",
  },
});
