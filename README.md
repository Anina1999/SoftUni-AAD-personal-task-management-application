# Personal Task Manager

A personal task management web app built with **Next.js** (App Router) and **SQLite**.
You can create, edit, delete, and search tasks. A task has a title and a description.

The app has two pages, **Home** and **Tasks**, each with its own URL and rendered on the server. Creating, editing, and deleting a task happen in **dialogs on the current page**: you never leave the page you're on. The dialogs submit to Server Actions, which save to SQLite and refresh the page's data.

---

## Requirements

- **Node.js 20 or newer** (developed on Node 24)
- npm

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The database file `data/tasks.db` is created automatically on first use.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Generate route types and run the TypeScript compiler |
| `npm run seed [-- <count>]` | Insert sample tasks for performance testing (default: 10,000). Start the app once first so the schema exists |

## Configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_PATH` | `./data/tasks.db` | Location of the SQLite database file |

All variables are listed in `.env.example`. To customise them, copy it to `.env.local` (git-ignored) and edit the values: `cp .env.example .env.local`. Both the app and `npm run seed` load `.env.local`.

## Pages

| URL | Page |
|---|---|
| `/` | **Home**: a "Total tasks" card, an "Add a new task" card, and the 5 most recent tasks |
| `/tasks?q=&page=` | **Tasks**: all tasks, with search and pagination (20 per page) |

On both pages:
- **Add task** / **New task** opens the create dialog.
- **Edit** on a task opens the same dialog, pre-filled.
- **Delete** opens a confirmation dialog that names the task and warns that deletion is permanent.

After each action the dialog closes, a short toast confirms what happened, and the count and lists update in place.

---

## Architecture

The code is split into layers. Each layer only calls the one directly below it.

```
Presentation   src/app/**/page.tsx, src/components/**   renders HTML, reads URL params
     │
Actions        src/app/tasks/actions.ts                 reads FormData, returns result, revalidates
     │
Service        src/lib/tasks/service.ts                 business rules, validation, pagination
     │
Repository     src/lib/tasks/repository.ts              SQL only (prepared statements)
     │
Database       src/lib/db/connection.ts, migrations.ts  connection, PRAGMAs, schema versions
```

- Pages and components never import the repository or the database directly.
- `src/lib/tasks/validation.ts` is the single source of the input rules. The service uses it, and the form uses the same limits for `maxLength` and character counters.
- The service layer doesn't depend on Next.js, so a future REST API (`app/api/**/route.ts`) or a CLI script can reuse it unchanged.

### Folder structure

```
src/
  app/
    layout.tsx                  shell: header + main + ToastProvider
    page.tsx, home.module.css   Home page (overview cards + recent tasks)
    error.tsx, not-found.tsx    error boundary ("Try again") and 404 page
    icon.svg, globals.css
    tasks/
      page.tsx                  Tasks page (search + pagination)
      loading.tsx               skeleton shown while the list loads
      actions.ts                create/update/delete Server Actions
  components/
    layout/                     SiteHeader (logo links to Home), NavLinks (Tasks, active link)
    tasks/                      TaskCard, TaskDescription, TaskActions, NewTaskButton,
                                TaskFormDialog + TaskForm, DeleteTaskDialog, SearchBar
    ui/                         Modal (native <dialog>), Toast, SubmitButton,
                                Pagination, EmptyState
  lib/
    db/                         connection + migrations
    tasks/                      types, validation, repository, service
    format.ts                   date formatting
scripts/seed.mjs                sample data generator
```

### Request flow examples

- **Viewing the list:** `GET /tasks?q=milk&page=2` → the `tasks/page.tsx` Server Component → `service.listTasks()` → `repository.countTasks()` and `repository.findTasks()` → HTML.
- **Creating a task:**
  1. "Add task" opens `TaskFormDialog`.
  2. `TaskForm` submits to `createTaskAction`.
  3. `service.createTask()` validates the input, and `repository.insertTask()` saves it.
  4. `revalidatePath("/", "layout")` makes Next.js re-render the current page with fresh data.
  5. The action returns `{ status: "success" }`, and the dialog closes and shows a toast.
- **Invalid input:** the action returns `{ status: "error", errors, values }`. The dialog stays open and shows field messages, and the text the user typed is kept.
- **Deleting a task:** `DeleteTaskDialog` asks for confirmation → `deleteTaskAction` → `service.deleteTask()` → revalidate → toast.

### Adding a new feature module

For example, *projects*:

1. Add a migration to the end of `MIGRATIONS` in `src/lib/db/migrations.ts`. Never edit existing migrations.
2. Create `src/lib/projects/` with `types.ts`, `validation.ts`, `repository.ts`, and `service.ts`, following the tasks module.
3. Create pages under `src/app/projects/` and Server Actions in `src/app/projects/actions.ts`. Reuse `Modal`, `Toast`, and `SubmitButton` for dialogs.
4. Add a link to `NAV_ITEMS` in `src/components/layout/NavLinks.tsx`.

To add a field to tasks (for example a due date): add a migration with `ALTER TABLE tasks ADD COLUMN ...` and a default value, then update `types.ts`, `validation.ts`, the repository columns, and `TaskForm`.

---

## Data safety

- **Crash safety:** `journal_mode = WAL` and `synchronous = FULL`. A committed write survives a crash or power loss, and the database file can't be left half-written.
- **Atomic writes:** each write is a single SQL statement, which SQLite runs atomically. Each migration runs in its own transaction.
- **Validation in two places:** the service layer validates input, and the database enforces the same rules again with `CHECK` and `NOT NULL` constraints.
- **No SQL injection:** all queries use bound parameters. `LIKE` wildcards in search terms are escaped.
- **Locking:** `busy_timeout = 5000` waits for a lock instead of failing.
- **Shutdown:** the connection is closed cleanly when the process exits.
- **Deletes:** nothing is deleted until the user confirms in the delete dialog.
- **No lost input:** if saving fails (validation, database, or network error), the dialog stays open with everything the user typed.

### Backups

While the app is running, use SQLite's online backup:

```bash
sqlite3 data/tasks.db ".backup 'backup-tasks.db'"
```

Or stop the app and copy `data/tasks.db`. If `tasks.db-wal` exists, copy it as well. The `data/` folder is git-ignored.

---

## Performance & UX notes

- Pages are rendered on the server. Only the interactive parts (dialogs, buttons, navigation, toast) run in the browser.
- Dialogs are mounted only while open, so a long list doesn't carry hidden dialogs for every task.
- The list is paginated (20 per page) and uses an index on `(created_at, id)`. With 10,000 tasks, list, search, and last-page requests are served in about 15–25 ms locally.
- `content-visibility: auto` on list cards lets the browser skip rendering cards that are off screen.
- Submit buttons are disabled while saving, which prevents double submissions.
- Dialogs use the native `<dialog>` element: focus stays inside the open dialog, Escape and backdrop clicks close it, and focus returns to the button that opened it. On phones the dialog becomes a bottom sheet.
- The layout is mobile-first, adapts to any screen width with no horizontal scrolling, and follows the system light/dark setting. It uses accessible labels, visible focus outlines, and touch targets of at least 44px.
