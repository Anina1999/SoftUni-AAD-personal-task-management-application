"use client";

/**
 * Search box for a task list (Home and Tasks).
 *
 * Results update as you type: after a short pause the URL's `?q=` is
 * replaced (no new history entry per keystroke) and the server re-renders the
 * list, so searches stay bookmarkable. Enter searches immediately. A new
 * search always returns to the first page. Without JavaScript it still works
 * as a plain GET form.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import styles from "./SearchBar.module.css";

/** Pause after the last keystroke before searching. */
const DEBOUNCE_MS = 250;

interface SearchBarProps {
  /** The current search, as rendered by the server. */
  query: string;
  /** Page the search runs on, e.g. "/" or "/tasks". */
  basePath: string;
  /** Show the "Search tasks" label above the input (otherwise screen-reader only). */
  showLabel?: boolean;
}

export function SearchBar({ query, basePath, showLabel = false }: SearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(query);
  // The last search this component navigated to, and the last `query` it rendered.
  const [searched, setSearched] = useState(query);
  const [renderedQuery, setRenderedQuery] = useState(query);

  // The URL changed from outside this box (back/forward, a "Clear search"
  // link): show that search. Searches started here are already in the box.
  if (query !== renderedQuery) {
    setRenderedQuery(query);
    if (query !== searched) {
      setValue(query);
      setSearched(query);
    }
  }

  const search = useCallback(
    (term: string) => {
      setSearched(term);
      const href = term ? `${basePath}?${new URLSearchParams({ q: term })}` : basePath;
      startTransition(() => router.replace(href, { scroll: false }));
    },
    [basePath, router],
  );

  useEffect(() => {
    const term = value.trim();
    if (term === searched) return;
    const timer = window.setTimeout(() => search(term), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [value, searched, search]);

  return (
    <form
      action={basePath}
      className={styles.search}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        search(value.trim());
      }}
    >
      <label htmlFor="task-search" className={showLabel ? styles.label : "visually-hidden"}>
        Search tasks
      </label>
      <div className={styles.field}>
        <input
          ref={inputRef}
          id="task-search"
          name="q"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search titles and descriptions…"
          className={`field-input ${styles.input}`}
          maxLength={200}
          autoComplete="off"
          aria-busy={isPending}
        />
        {isPending && <span className={styles.spinner} aria-hidden="true" />}
      </div>
      {value && (
        <button
          type="button"
          className={`btn btn-secondary ${styles.clear}`}
          onClick={() => {
            setValue("");
            search("");
            inputRef.current?.focus();
          }}
        >
          Clear
        </button>
      )}
    </form>
  );
}
