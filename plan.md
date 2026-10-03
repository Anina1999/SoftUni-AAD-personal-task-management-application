# Personal Task Manager — Implementation Plan

A personal task management web application built with **Next.js** and **SQLite**.
Version 1 scope: users can **create, edit, delete, and search tasks**. A task has a **title** and a **description**.

The app has two server-rendered pages, **Home** and **Tasks**, each with its own URL. Creating, editing, and deleting a task happen in **dialogs on the current page**, backed by Server Actions. New sections (status, due dates, tags, projects, users) can be added later as new pages and modules.

---

## 1. Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | **Next.js (App Router)** | File-based routing for many pages, Server Components, Server Actions, and streaming |
| Language | **TypeScript** (strict mode) | Type safety across the database, service, and UI layers |
| UI | **React** (Server Components first, client components only for interactive form parts) | Minimal JavaScript sent to the browser |
| Database | **SQLite** via **`better-sqlite3`** | Embedded and needs no separate server; fast synchronous API with real transactions; prebuilt binaries for Windows, macOS, and Linux |
| Styling | **Plain CSS**: global design tokens plus **CSS Modules** per component | No extra build tooling; scoped styles; easy theming (light and dark) |
| Mutations | **Server Actions** called from dialog forms (`useActionState`) | Type-safe server calls with no hand-written API layer in v1 |
| Runtime | **Node.js ≥ 20** (developed on Node 24) | Required by Next.js and `better-sqlite3` |
| Tooling | `tsc --noEmit`, `next build`, ESLint (`eslint-config-next`) | Static checks before running the app |

**Not included in v1 (on purpose):**
- A REST or JSON API. The service layer is framework-agnostic, so `/api/*` route handlers can be added later as a thin wrapper.
- An ORM. The SQL is small and explicit, and the repository pattern keeps it in one place.
- Authentication. This is a personal, single-user app for now.

---

## 2. Architecture (layered, modular)

### 2.1 Layers

```
┌────────────────────────────────────────────────────────────┐
│  Presentation   app/**/page.tsx, components/**             │  Renders HTML, reads URL params
├────────────────────────────────────────────────────────────┤
│  Actions        app/tasks/actions.ts  ('use server')       │  Parses FormData, calls service,
│                                                            │  revalidates, returns result
├────────────────────────────────────────────────────────────┤
│  Service        lib/tasks/service.ts                       │  Business rules + validation
├────────────────────────────────────────────────────────────┤
│  Repository     lib/tasks/repository.ts                    │  SQL only (prepared statements)
├────────────────────────────────────────────────────────────┤
│  Database       lib/db/connection.ts, lib/db/migrations.ts │  Connection, PRAGMAs, schema
└────────────────────────────────────────────────────────────┘
```

**Rules:**
- Each layer may call only the layer directly below it.
- Pages and components never import the repository or the database.
- Only the repository contains SQL.
- Validation lives in a single module, `lib/tasks/validation.ts`. The service uses it, and the form uses the same limits for its UI hints.
- Everything under `lib/` is server-only and is marked with `import 'server-only'`, except the validation constants and types.

### 2.2 Modularity (feature folders)

Each feature owns its own folders. A future feature (for example `projects`) is added by creating `app/projects/` and `lib/projects/` with the same structure, without touching `tasks`.

```
src/
  app/
    layout.tsx                  Shared shell: header/nav, <main>, ToastProvider
    page.tsx                    Home: "Total tasks" card, "Add a new task" card, recent tasks
    home.module.css
    error.tsx                   Friendly error boundary with "Try again" (all pages)
    not-found.tsx               Global 404 page
    globals.css                 Design tokens, reset, dark mode, shared primitives
    icon.svg                    Favicon
    tasks/
      page.tsx                  Tasks: search (?q=) + pagination (?page=)
      loading.tsx               Skeleton while the list streams
      actions.ts                create / update / delete Server Actions (return results)
  components/
    layout/SiteHeader.tsx       App name + main navigation
    layout/NavLinks.tsx         Home / Tasks links, highlights the active one
    tasks/TaskCard.tsx          Title, description preview, date, Edit/Delete
    tasks/TaskDescription.tsx   Clamped description with "Show more"
    tasks/TaskActions.tsx       Edit/Delete buttons; opens the matching dialog
    tasks/NewTaskButton.tsx     Opens the create dialog
    tasks/TaskFormDialog.tsx    Create/edit dialog (wraps TaskForm)
    tasks/TaskForm.tsx          Shared create/edit form (useActionState)
    tasks/DeleteTaskDialog.tsx  Delete confirmation dialog
    tasks/SearchBar.tsx         GET search form
    ui/Modal.tsx                Native <dialog> wrapper (focus, Esc, backdrop, portal)
    ui/Toast.tsx                ToastProvider + useToast()
    ui/SubmitButton.tsx         Pending state via useFormStatus
    ui/Pagination.tsx           Page links built from URL params
    ui/EmptyState.tsx           Empty list / no search results
  lib/
    db/connection.ts            Singleton connection (survives dev hot-reload), PRAGMAs, graceful close
    db/migrations.ts            Versioned migrations using PRAGMA user_version
    tasks/types.ts              Task, TaskInput, Page<T>
    tasks/validation.ts         Limits + validateTaskInput()
    tasks/repository.ts         findTasks, countTasks, findTaskById, insert, update, delete
    tasks/service.ts            listTasks, countTasks, listRecentTasks, create/update/deleteTask
    format.ts                   Date formatting for display
scripts/
  seed.mjs                      Inserts N sample tasks (performance testing)
data/
  tasks.db                      SQLite file (git-ignored, created automatically)
```

### 2.3 Pages and interactions

| URL | Page | Data |
|---|---|---|
| `/` | **Home**: "Total tasks" card, "Add a new task" card, 5 most recent tasks | `service.countTasks`, `service.listRecentTasks` |
| `/tasks?q=&page=` | **Tasks**: all tasks, with search and pagination | `service.listTasks` |

Create, edit, and delete happen in **dialogs on the current page**. There are no separate form pages.

| Action | UI | Server |
|---|---|---|
| Create | "Add task" / "New task" → `TaskFormDialog` | `createTaskAction` |
| Edit | "Edit" on a card → `TaskFormDialog` (pre-filled) | `updateTaskAction` |
| Delete | "Delete" on a card → `DeleteTaskDialog` (names the task, warns it's permanent) | `deleteTaskAction` |

Each action returns a result (`success` or `error`). On success, it calls `revalidatePath("/", "layout")`, so the current page re-renders with fresh data. The dialog then closes and a toast confirms the action. On error the dialog stays open, showing field errors, and the values the user typed are kept.

### 2.4 Data model

```sql
CREATE TABLE tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 5000),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_tasks_created_at ON tasks (created_at DESC, id DESC);
```

---

## 3. Data safety

| Risk | Mitigation |
|---|---|
| Corruption on crash or power loss | `PRAGMA journal_mode = WAL` + `PRAGMA synchronous = FULL`, so a write is durable once it is committed |
| Partial writes | Each mutation and each migration step runs inside a transaction (`db.transaction(...)`) |
| Invalid data | Two layers of validation: the service layer (`validateTaskInput`) and database `CHECK`/`NOT NULL` constraints |
| SQL injection | Only parameterised prepared statements; no string concatenation in SQL. In search, `LIKE` wildcards are escaped (`ESCAPE '\'`) |
| Schema changes losing data | Versioned, forward-only migrations tracked in `PRAGMA user_version`; each step is transactional |
| Concurrent access | WAL allows readers alongside one writer; `PRAGMA busy_timeout = 5000` avoids "database is locked" errors |
| Multiple connections in dev (hot-reload) | The connection is cached on `globalThis`, so there is one connection per process |
| Unclean shutdown | The connection is closed on `exit`, `SIGINT`, and `SIGTERM` |
| Invalid IDs | Route `id` is parsed as a positive integer; anything else returns a 404, never a database error |
| Lost user input on error | When validation fails, the form re-renders with the submitted values and field-level messages |
| Accidental deletion | A separate confirmation page is required before a delete |
| Accidental commit of data | `data/` and `*.db*` are in `.gitignore` |
| Backups | The README documents a safe backup method (`sqlite3 data/tasks.db ".backup backup.db"`, or copying the file while the app is stopped) |

---

## 4. Performance / responsiveness

- **Server rendering:** pages are Server Components that read SQLite directly. There is no client-side fetching and no loading spinners after the page has loaded, and very little JavaScript is shipped.
- **Prepared statements:** compiled once and reused; SQLite runs in-process, so there is no network round-trip.
- **Pagination:** the list shows 20 tasks per page using `LIMIT/OFFSET`, with the index on `(created_at, id)`. The browser never renders thousands of items at once.
- **Search:** case-insensitive `LIKE` over title and description, run on the server. This is fast enough for a personal dataset. If needed later, it can be upgraded to SQLite **FTS5** without changing the UI.
- **Streaming:** `loading.tsx` shows a skeleton right away while the task list loads.
- **Prefetching:** `<Link>` prefetches pages, so moving between list, details, and edit feels instant.
- **No freezing:**
  - All database work happens on the server, never in the browser.
  - Submit buttons show a pending state and are disabled while saving, which prevents double submits.
  - Long text is truncated in the list with CSS (`line-clamp`).
- **Small bundles:** only `TaskForm` and `SubmitButton` are client components, and no UI libraries are used.

---

## 5. UX / layout

- **Responsive, mobile-first layout:**
  - Content is in a single centred column (max width about 760px) with comfortable spacing.
  - On wide screens the list uses a roomier card layout.
  - On phones there is a 16px side gutter and no horizontal scrolling.
- **Navigation:** a sticky header shows the app name and **Home / Tasks** links, with the active page highlighted.
- **Home:** a "Total tasks" card (with a link to all tasks), an "Add a new task" card, and the 5 most recent tasks.
- **Dialogs:**
  - Create and edit use the same form dialog. Delete uses a confirmation dialog that names the task.
  - They use the native `<dialog>`: focus stays inside, Escape and backdrop clicks close it, and focus returns to the button that opened it.
  - On phones the dialog becomes a bottom sheet.
- **List page:**
  - A search bar at the top.
  - A result count, for example "Showing 21–40 of 312".
  - Each card shows the title, a 3-line description preview (with "Show more"), the created or updated date, and Edit/Delete buttons.
  - Numbered pagination, with Prev and Next links.
  - Separate empty states for "No tasks yet" and "No tasks match 'xyz'".
- **Forms:**
  - Labelled inputs and a character counter for the title and description.
  - Inline error messages next to each field.
  - Autofocus on the title field.
  - Clear Save and Cancel actions.
- **Feedback:** a toast after create, update, or delete, and friendly 404 and error pages.
- **Accessibility:**
  - Semantic HTML (`header`, `main`, `nav`, `form`, `label`).
  - Visible focus styles and full keyboard navigation.
  - `aria-invalid` and `aria-describedby` on fields with errors.
  - Colour contrast at WCAG AA.
- **Theming:** light and dark mode follow `prefers-color-scheme`, using CSS custom properties.

---

## 6. Docs

- **`README.md`** covers:
  - What the app is
  - Requirements (Node version)
  - Setup (`npm install`, `npm run dev`)
  - Scripts
  - Environment variables (`DATABASE_PATH`, optional)
  - Architecture overview and diagram
  - Folder structure
  - Data-safety notes and the backup method
  - "How to add a new feature/module", step by step
- **JSDoc** on every module and exported function: purpose, parameters, return value, and errors thrown.
- **Inline comments** only where the reason isn't obvious from the code (PRAGMA choices, migration rules).
- **`plan.md`** (this file) is kept up to date as the design reference.

---

## 7. Implementation steps

1. **Project setup**
   - `package.json`, scripts (`dev`, `build`, `start`, `lint`, `typecheck`)
   - Install `next`, `react`, `react-dom`, `better-sqlite3`, `server-only`, plus TypeScript, `@types/*`, and ESLint as dev dependencies
   - `tsconfig.json` (strict, `@/*` path alias), `next.config.ts` (`serverExternalPackages: ['better-sqlite3']`), `.gitignore`
2. **Database layer:** `lib/db/connection.ts` (singleton, PRAGMAs, shutdown hooks) and `lib/db/migrations.ts` (v1 schema).
3. **Tasks domain:** `types.ts`, `validation.ts`, `repository.ts`, and `service.ts`.
4. **Shared UI:** `globals.css` (tokens, dark mode), `app/layout.tsx`, `SiteHeader`, and the `ui/*` components.
5. **Task pages:** the list (with search and pagination), `loading.tsx`, `error.tsx`, the details page, and `not-found` pages.
6. **Mutations:** `actions.ts`, `TaskForm` (create and edit), and the delete confirmation page.
7. **Polish:** notices, breadcrumbs, empty states, a responsive check, and an accessibility pass.
8. **Docs:** `README.md` and JSDoc review.
9. **Verification** (see section 8).

---

## 8. Verifications

**Static checks**
- [ ] `npm run typecheck`: no TypeScript errors
- [ ] `npm run lint`: no ESLint errors
- [ ] `npm run build`: production build succeeds

**Functional (manual, in the browser, using `npm run dev` and then `npm start`)**
- [ ] The first run creates `data/tasks.db` automatically, and Home shows a count of 0 and the empty state
- [ ] The navigation shows Home and Tasks and highlights the current page
- [ ] Create a task from Home: the dialog opens without leaving the page, closes on save, a toast appears, and the count and recent list update
- [ ] An empty or whitespace-only title, or a title over 200 characters, shows a field error in the dialog, and the typed values are kept
- [ ] Edit a task in its dialog (pre-filled): the changes are saved, the card shows "Updated", and a toast appears
- [ ] Escape, the × button, or a backdrop click closes a dialog without saving, and focus returns to the button that opened it
- [ ] Delete: the confirmation dialog names the task, Cancel keeps it, and Delete removes it with a toast, on the same page
- [ ] All of the above also works on the Tasks page, including inside search results
- [ ] Unknown URLs show the 404 page, and database errors show the error page with "Try again"

**Data safety**
- [ ] Stop the server with Ctrl+C and restart it: all tasks are still there
- [ ] `PRAGMA journal_mode` returns `wal` and `PRAGMA integrity_check` returns `ok`
- [ ] Search input such as `%`, `_`, `'`, or `"; DROP TABLE tasks; --` is treated as literal text

**Performance / scale**
- [ ] Seed about 10,000 tasks with a dev script (`scripts/seed.ts`). The list, search, and pagination still respond in well under a second, and the browser stays responsive
- [ ] Rapid double-clicks on Save create only one task

**Responsive / UX**
- [ ] Check the layout at about 375px, 768px, and 1280px: no horizontal scroll and readable text
- [ ] Keyboard-only walkthrough of every page works, with visible focus
- [ ] Light and dark mode both look correct

**Docs**
- [ ] A fresh clone set up by following only the README runs the app successfully
