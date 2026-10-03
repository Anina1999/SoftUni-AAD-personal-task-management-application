/**
 * Numbered pagination built from plain links, so every page has its own
 * shareable URL and works without JavaScript.
 *
 * Shows: Prev · 1 … (current-1) current (current+1) … last · Next
 */
import Link from "next/link";
import styles from "./Pagination.module.css";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Builds the URL for a given page number (keeps other params like `q`). */
  hrefForPage: (page: number) => string;
}

type PageItem = number | "gap";

/** Computes which page numbers to show, inserting gaps where pages are skipped. */
function pageItems(page: number, totalPages: number): PageItem[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const items: PageItem[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push("gap");
    items.push(p);
  });
  return items;
}

export function Pagination({ page, totalPages, hrefForPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className={styles.pagination}>
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} className={styles.link} rel="prev">
          ‹ Prev
        </Link>
      ) : (
        <span className={`${styles.link} ${styles.disabled}`}>‹ Prev</span>
      )}

      <ol className={styles.pages}>
        {pageItems(page, totalPages).map((item, index) =>
          item === "gap" ? (
            <li key={`gap-${index}`} className={styles.gap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={hrefForPage(item)}
                className={`${styles.link} ${item === page ? styles.current : ""}`}
                aria-current={item === page ? "page" : undefined}
                aria-label={`Page ${item}`}
              >
                {item}
              </Link>
            </li>
          ),
        )}
      </ol>

      {page < totalPages ? (
        <Link href={hrefForPage(page + 1)} className={styles.link} rel="next">
          Next ›
        </Link>
      ) : (
        <span className={`${styles.link} ${styles.disabled}`}>Next ›</span>
      )}
    </nav>
  );
}
