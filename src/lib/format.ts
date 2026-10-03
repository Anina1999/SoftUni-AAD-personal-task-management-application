/**
 * Display formatting helpers shared by pages and components.
 */

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Formats an ISO timestamp for display, e.g. "3 Oct 2026, 14:05". */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}
