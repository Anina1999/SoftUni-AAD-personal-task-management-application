import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { MIGRATIONS, runMigrations } from "@/lib/db/migrations";

let db: Database.Database;

afterEach(() => {
  db?.close();
});

describe("runMigrations", () => {
  it("upgrades a version 1 database, giving existing tasks priority 3 and no due date", () => {
    db = new Database(":memory:");
    db.exec(MIGRATIONS[0]);
    db.pragma("user_version = 1");
    db.prepare("INSERT INTO tasks (title, description) VALUES (?, ?)").run("Buy milk", "2 litres");

    runMigrations(db);

    expect(db.pragma("user_version", { simple: true })).toBe(MIGRATIONS.length);
    expect(db.prepare("SELECT title, description, priority, due_date FROM tasks").get()).toEqual({
      title: "Buy milk",
      description: "2 litres",
      priority: 3,
      due_date: null,
    });
  });

  it("does nothing on a database that is already up to date", () => {
    db = new Database(":memory:");
    runMigrations(db);

    expect(() => runMigrations(db)).not.toThrow();
    expect(db.pragma("user_version", { simple: true })).toBe(MIGRATIONS.length);
  });
});
