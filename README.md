# Personal Task Manager

A personal task management web app built with **Next.js** (App Router) and **SQLite**.
You can create, edit, delete, and search tasks. A task has a title and a description.

The app has two pages, **Home** and **Tasks**, each with its own URL and rendered on the server. **Home** is the everyday workspace: you can list, search, create, edit, and delete tasks there without leaving the page. **Tasks** is the full, paginated list. Creating, editing, and deleting happen inline or in **dialogs on the current page**, which call a small **JSON API** (`/api/tasks`) that exposes every CRUD operation.

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
| `npm run typecheck` | Generate route types and run the TypeScript compiler (app and tests) |
| `npm run test:component` | Run the Cypress component tests headlessly |
| `npm run test:component:open` | Open Cypress to run and debug component tests interactively |
| `npm run seed [-- <count>]` | Insert sample tasks for performance testing (default: 10,000). Start the app once first so the schema exists |

## Configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_PATH` | `./data/tasks.db` | Location of the SQLite database file |

All variables are listed in `.env.example`. To customise them, copy it to `.env.local` (git-ignored) and edit the values: `cp .env.example .env.local`. Both the app and `npm run seed` load `.env.local`.

## Pages

| URL | Page |
|---|---|
| `/?q=` | **Home** (titled "Your tasks"): search box at the top, a "New task" button, and the 10 newest matching tasks, with a link to the full list |
| `/tasks?q=&page=` | **Tasks**: all tasks, with live search and pagination (20 per page) |

On **Home**:
- **Search** updates the list as you type. **Clear** resets it.
- **See all in Tasks** opens the Tasks page with the same search.

On both pages:
- **New task** opens the create dialog.
- **Edit** on a task opens the edit dialog, pre-filled.
- **Delete** opens a confirmation dialog that names the task and warns that deletion is permanent.

After each action the dialog closes, a short toast confirms what happened, and the count and lists update in place.

## API

All responses are JSON. Errors have the shape `{ "error": "message", "errors": { "title": "…" } }` (`errors` only for validation failures).

| Method & path | Body | Success | Errors |
|---|---|---|---|
| `GET /api/tasks?q=&page=&pageSize=` | | `200` `{ items, total, page, pageSize, totalPages }` | |
| `POST /api/tasks` | `{ "title": "…", "description": "…" }` | `201` task + `Location` header | `400`, `415` |
| `GET /api/tasks/:id` | | `200` task | `404` |
| `PATCH /api/tasks/:id` | any of `title`, `description` | `200` task | `400`, `404`, `415` |
| `DELETE /api/tasks/:id` | | `204` | `404` |

`pageSize` defaults to 20 (max 100). Write requests must use `Content-Type: application/json`, which also protects against cross-site form posts.

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk","description":"2 litres"}'
```

---

## Architecture

The code is split into layers. Each layer only calls the one directly below it.

```
Presentation   src/app/**/page.tsx, src/components/**   renders HTML, reads URL params;
               src/lib/tasks/api-client.ts              dialogs call the API
     │
API            src/app/api/tasks/**/route.ts            parses JSON, returns JSON + HTTP status
     │
Service        src/lib/tasks/service.ts                 business rules, validation, pagination
     │
Repository     src/lib/tasks/repository.ts              SQL only (prepared statements)
     │
Database       src/lib/db/connection.ts, migrations.ts  connection, PRAGMAs, schema versions
```

- Pages and components never import the repository or the database directly.
- Server Component pages read through the service directly (no HTTP round trip to their own server). Every write goes through the API.
- `src/lib/tasks/validation.ts` is the single source of the input rules. The service uses it, and the form uses the same limits for `maxLength` and character counters.
- The service layer doesn't depend on Next.js, so a CLI script can reuse it unchanged.

### Folder structure

```
src/
  app/
    layout.tsx                  shell: header + main + ToastProvider
    page.tsx, home.module.css   Home page (live search + newest tasks)
    error.tsx, not-found.tsx    error boundary ("Try again") and 404 page
    icon.svg, globals.css
    tasks/
      page.tsx                  Tasks page (search + pagination)
      loading.tsx               skeleton shown while the list loads
    api/
      http.ts                   shared JSON error/body helpers
      tasks/route.ts            GET list, POST create
      tasks/[id]/route.ts       GET, PATCH, DELETE one task
  components/
    layout/                     SiteHeader (logo links to Home), NavLinks (Tasks, active link)
    tasks/                      TaskCard, TaskDescription, TaskActions, NewTaskButton,
                                TaskFormDialog + TaskForm, DeleteTaskDialog, SearchBar (live)
    ui/                         Modal (native <dialog>), Toast, SubmitButton,
                                Pagination, EmptyState
  lib/
    db/                         connection + migrations
    tasks/                      types, validation, repository, service, api-client (browser)
    format.ts                   date formatting
scripts/seed.mjs                sample data generator
```

### Request flow examples

- **Viewing the list:** `GET /tasks?q=milk&page=2` → the `tasks/page.tsx` Server Component → `service.listTasks()` → `repository.countTasks()` and `repository.findTasks()` → HTML.
- **Searching on Home:** typing in `SearchBar` → after 250 ms `router.replace("/?q=milk")` in a transition → `page.tsx` re-renders on the server → the list swaps in place while the input keeps focus.
- **Creating a task:**
  1. "New task" opens `TaskFormDialog`; `TaskForm` calls `api-client.createTask()`.
  2. That sends `POST /api/tasks` with a JSON body.
  3. The route handler calls `service.createTask()`, which validates the input, and `repository.insertTask()` saves it. The handler returns `201` with the task.
  4. The client shows a toast and calls `router.refresh()`, so Next.js re-renders the current page with fresh data.
- **Invalid input:** the API returns `400 { error, errors }`. The dialog stays open and shows field messages, and the text the user typed is kept.
- **Deleting a task:** `DeleteTaskDialog` asks for confirmation → `DELETE /api/tasks/:id` → `service.deleteTask()` → `204` → toast + refresh.

### Adding a new feature module

For example, *projects*:

1. Add a migration to the end of `MIGRATIONS` in `src/lib/db/migrations.ts`. Never edit existing migrations.
2. Create `src/lib/projects/` with `types.ts`, `validation.ts`, `repository.ts`, and `service.ts`, following the tasks module.
3. Add API routes under `src/app/api/projects/` (reuse `handle`, `readJsonObject`, and `errorResponse` from `src/app/api/http.ts`), a browser client like `src/lib/tasks/api-client.ts`, and pages under `src/app/projects/`. Reuse `Modal`, `Toast`, and `SubmitButton` for dialogs.
4. Add a link to `NAV_ITEMS` in `src/components/layout/NavLinks.tsx`.

To add a field to tasks (for example a due date): add a migration with `ALTER TABLE tasks ADD COLUMN ...` and a default value, then update `types.ts`, `validation.ts`, the repository columns, and `TaskForm`.

---

## Testing

The task dialogs (create, edit, delete) are covered by **Cypress component tests** in `tests/`. Each test mounts a component on its own, with no server, database or shared data, so tests can run in any order or one at a time.

```
tests/
  component/tasks/       create-task, edit-task, delete-task specs
  support/
    component.tsx        cy.mount (toast provider + stubbed router), unstubbed-request guard
    api.ts               stubTask* helpers for /api/tasks, buildTask, apiError, heldResponse
    next-navigation.tsx  test double for next/navigation
```

- **API calls are stubbed** with `cy.intercept` (`stubCreateTask`, `stubUpdateTask`, `stubDeleteTask`). The real `api-client.ts` still runs, so request bodies, headers and error handling are tested too. A request a test hasn't stubbed fails that test.
- **Router:** `next/navigation` is swapped for a test double whose methods are Cypress stubs, e.g. `cy.get("@router.refresh").should("have.been.calledOnce")`.
- **Pending states** use `heldResponse()`, which holds a response until the test releases it, so no timing-based delays are needed.
- **Speed:** components are bundled with Vite rather than Next.js (`cypress.config.ts`), `cypress run` reuses a single browser tab, and video recording is off. Screenshots of failures go to `tests/.artifacts/` (git-ignored).

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
