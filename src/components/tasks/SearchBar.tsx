/**
 * Search form for the task list.
 *
 * A plain GET form: submitting navigates to `/tasks?q=...`, so results are
 * bookmarkable and work without JavaScript. `next/form` upgrades it to a
 * client-side navigation when JavaScript is available. Submitting a new
 * search intentionally drops `page`, returning to the first page.
 */
import Form from "next/form";
import Link from "next/link";
import styles from "./SearchBar.module.css";

export function SearchBar({ query }: { query: string }) {
  return (
    <Form action="/tasks" className={styles.search} role="search">
      <label htmlFor="task-search" className="visually-hidden">
        Search tasks
      </label>
      <input
        id="task-search"
        name="q"
        type="search"
        defaultValue={query}
        placeholder="Search title or description…"
        className={`field-input ${styles.input}`}
        maxLength={200}
        autoComplete="off"
      />
      <button type="submit" className="btn btn-secondary">
        Search
      </button>
      {query && (
        <Link href="/tasks" className={`btn btn-secondary ${styles.clear}`}>
          Clear
        </Link>
      )}
    </Form>
  );
}
