/**
 * Home page (`/?q=<search>`): the everyday workspace.
 *
 * Everything needed day to day is on this one page: a "New task" button,
 * live search, and the newest matching tasks with Edit/Delete, which open
 * dialogs. It mirrors the Tasks page partially: it shows the first
 * `HOME_LIST_SIZE` matches and links to the Tasks page for the full,
 * paginated list.
 */
import Link from "next/link";
import { NewTaskButton } from "@/components/tasks/NewTaskButton";
import { SearchBar } from "@/components/tasks/SearchBar";
import { TaskCard } from "@/components/tasks/TaskCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { countTasks, listTasks, normaliseSearch } from "@/lib/tasks/service";
import styles from "./home.module.css";

const HOME_LIST_SIZE = 10;

export default async function HomePage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const query = normaliseSearch(searchParams.q);

  const result = listTasks({ search: query, pageSize: HOME_LIST_SIZE });
  const total = query ? countTasks() : result.total;
  const tasksPageHref = query ? `/tasks?${new URLSearchParams({ q: query })}` : "/tasks";
  const hasMore = result.total > result.items.length;

  return (
    <>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Your day, organised</p>
          <h1 className="page-title">Your tasks</h1>
          <p className={styles.subtitle}>A clear space for everything you need to do.</p>
        </div>
        <NewTaskButton />
      </div>

      {total === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Create your first task to get started."
          action={<NewTaskButton label="Create a task" />}
        />
      ) : (
        <>
          <div className={`card ${styles.searchCard}`}>
            <SearchBar query={query} basePath="/" showLabel />
          </div>

          <section aria-labelledby="home-tasks-heading">
            <h2 id="home-tasks-heading" className="visually-hidden">
              {query ? "Search results" : "Tasks"}
            </h2>

            {result.total === 0 ? (
              <EmptyState
                title={`No tasks match “${query}”`}
                description="Try a different search term."
                action={
                  <Link href="/" className="btn btn-secondary">
                    Clear search
                  </Link>
                }
              />
            ) : (
              <>
                <p className={styles.summary} aria-live="polite">
                  {hasMore && <>Showing {result.items.length} of </>}
                  {result.total} {result.total === 1 ? "task" : "tasks"}
                  {query && <> matching “{query}”</>} · Newest first
                </p>

                <ul className="task-list">
                  {result.items.map((task) => (
                    <li key={task.id}>
                      <TaskCard task={task} />
                    </li>
                  ))}
                </ul>

                {hasMore && (
                  <p className={styles.more}>
                    <Link href={tasksPageHref} className={styles.link}>
                      See all {result.total} in Tasks <span aria-hidden="true">→</span>
                    </Link>
                  </p>
                )}
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}
