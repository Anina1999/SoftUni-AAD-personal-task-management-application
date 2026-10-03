/**
 * Runs before every unit test file: replaces the app's shared connection
 * (`@/lib/db/connection`) with a fresh in-memory database for every test.
 */
import { afterEach, beforeEach, vi } from "vitest";
import { closeTestDb, openTestDb } from "./support/database";

vi.mock("@/lib/db/connection", async () => {
  const { testDb } = await import("./support/database");
  return { getDb: testDb };
});

beforeEach(openTestDb);
afterEach(closeTestDb);
