/**
 * Task list page: `/tasks?q=<search>&page=<n>`.
 *
 * Rendered on the server straight from SQLite. Search and page number live
 * in the URL, so every view is bookmarkable and the back button works.
 * Creating, editing, and deleting happen in dialogs on this page.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { NewTaskButton } from "@/components/tasks/NewTaskButton";
import { SearchBar } from "@/components/tasks/SearchBar";
import { TaskCard } from "@/components/tasks/TaskCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { listTasks, normaliseSearch } from "@/lib/tasks/service";
import styles from "./tasks.module.css";

export const metadata: Metadata = { title: "Tasks" };

/** Builds a list URL, omitting default values to keep URLs clean. */
function listHref(query: string, page: number): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/tasks?${search}` : "/tasks";
}

export default async function TasksPage(props: PageProps<"/tasks">) {
  const searchParams = await props.searchParams;
  const query = normaliseSearch(searchParams.q);
  const requestedPage = Number(searchParams.page ?? 1);

  const result = listTasks({ search: query, page: requestedPage });

  const firstShown = (result.page - 1) * result.pageSize + 1;
  const lastShown = firstShown + result.items.length - 1;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
        <NewTaskButton />
      </div>

      <SearchBar query={query} basePath="/tasks" />

      {result.total === 0 ? (
        query ? (
          <EmptyState
            title={`No tasks match “${query}”`}
            description="Try a different search term."
            action={
              <Link href="/tasks" className="btn btn-secondary">
                Clear search
              </Link>
            }
          />
        ) : (
          <EmptyState
            title="No tasks yet"
            description="Create your first task to get started."
            action={<NewTaskButton label="Create a task" />}
          />
        )
      ) : (
        <>
          <p className={styles.summary} aria-live="polite">
            Showing {firstShown}–{lastShown} of {result.total}{" "}
            {result.total === 1 ? "task" : "tasks"}
            {query && <> matching “{query}”</>}
          </p>

          <ul className="task-list">
            {result.items.map((task) => (
              <li key={task.id}>
                <TaskCard task={task} />
              </li>
            ))}
          </ul>

          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            hrefForPage={(page) => listHref(query, page)}
          />
        </>
      )}
    </>
  );
}
