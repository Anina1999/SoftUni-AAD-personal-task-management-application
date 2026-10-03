/**
 * Display formatting helpers shared by pages and components.
 */
import type { TaskPriority } from "@/lib/tasks/types";

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

// Due dates are calendar dates with no time zone: format them in UTC so the
// day never shifts, whatever the viewer's (or server's) time zone.
const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  1: "Highest",
  2: "High",
  3: "Normal",
  4: "Low",
};

/** Formats an ISO timestamp for display, e.g. "3 Oct 2026, 14:05". */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/** Formats a `YYYY-MM-DD` date for display, e.g. "3 Oct 2026". */
export function formatDate(date: string): string {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

/** Names a priority for display, e.g. 1 → "Highest". */
export function formatPriority(priority: TaskPriority): string {
  return PRIORITY_LABELS[priority];
}
