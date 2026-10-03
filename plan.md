# Personal Task Manager — Implementation Plan

A personal task management web application built with **Next.js** and **SQLite**.
Version 1 scope: users can **create, edit, delete, and search tasks**. A task has a **title** and a **description**.

The app has two server-rendered pages, **Home** and **Tasks**, each with its own URL. **Home is the everyday workspace**: it lists tasks and lets the user search, create, edit, and delete them without leaving the page, in as few clicks as possible. **Tasks** is the full, paginated list. Creating, editing, and deleting happen in **dialogs on the current page**, backed by a small **JSON API** (`/api/tasks`) that exposes every CRUD operation. New sections (status, due dates, tags, projects, users) can be added later as new pages, header links, and modules.

---

## 1. Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | **Next.js (App Router)** | File-based routing for pages and API routes, Server Components, and streaming |
| Language | **TypeScript** (strict mode) | Type safety across the database, service, and UI layers |
| UI | **React** (Server Components first, client components only for interactive form parts) | Minimal JavaScript sent to the browser |
| Database | **SQLite** via **`better-sqlite3`** | Embedded and needs no separate server; fast synchronous API with real transactions; prebuilt binaries for Windows, macOS, and Linux |
| Styling | **Plain CSS**: global design tokens plus **CSS Modules** per component | No extra build tooling; scoped styles; easy theming (light and dark) |
| API / mutations | **JSON API** via Next.js Route Handlers (`app/api/tasks/**`), called from the dialogs through a small typed client | One backend contract for every CRUD operation, usable by the UI, scripts, or a future mobile app |
| Runtime | **Node.js ≥ 20** (developed on Node 24) | Required by Next.js and `better-sqlite3` |
| Tooling | `tsc --noEmit`, `next build`, ESLint (`eslint-config-next`) | Static checks before running the app |

**Not included in v1 (on purpose):**
- An ORM. The SQL is small and explicit, and the repository pattern keeps it in one place.
- Authentication. This is a personal, single-user app for now.

---

## 2. Architecture (layered, modular)

### 2.1 Layers

```
┌────────────────────────────────────────────────────────────┐
│  Presentation   app/**/page.tsx, components/**             │  Renders HTML, reads URL params;
│                 lib/tasks/api-client.ts (browser)          │  dialogs call the API
├────────────────────────────────────────────────────────────┤
│  API            app/api/tasks/route.ts, [id]/route.ts      │  Parses JSON, calls service,
│                                                            │  returns JSON + HTTP status
├────────────────────────────────────────────────────────────┤
│  Service        lib/tasks/service.ts                       │  Business rules + validation
├────────────────────────────────────────────────────────────┤
│  Repository     lib/tasks/repository.ts                    │  SQL only (prepared statements)
├────────────────────────────────────────────────────────────┤
│  Database       lib/db/connection.ts, lib/db/migrations.ts │  Connection, PRAGMAs, schema
└────────────────────────────────────────────────────────────┘
```

**Rules:**
- Each layer may call only the layer directly below it. Reads are the one shortcut: Server Component pages call the service directly to render HTML (no HTTP round trip to their own server). Every write goes through the API.
- Pages and components never import the repository or the database.
- Only the repository contains SQL.
- Validation lives in a single module, `lib/tasks/validation.ts`. The service uses it, and the form uses the same limits for its UI hints.
- Everything under `lib/` is server-only and is marked with `import 'server-only'`, except the validation constants, types, and the browser API client.

### 2.2 Modularity (feature folders)

Each feature owns its own folders. A future feature (for example `projects`) is added by creating `app/projects/` and `lib/projects/` with the same structure, without touching `tasks`.

```
src/
  app/
    layout.tsx                  Shared shell: header/nav, <main>, ToastProvider
    page.tsx                    Home workspace ("Your tasks"): live search (?q=), New task, newest 10
    home.module.css
    error.tsx                   Friendly error boundary with "Try again" (all pages)
    not-found.tsx               Global 404 page
    globals.css                 Design tokens, reset, dark mode, shared primitives
    icon.svg                    Favicon
    tasks/
      page.tsx                  Tasks: search (?q=) + pagination (?page=)
      loading.tsx               Skeleton while the list streams
    api/
      http.ts                   JSON error responses, body parsing, 500 handling
      tasks/route.ts            GET (list/search/paginate), POST (create)
      tasks/[id]/route.ts       GET, PATCH (partial update), DELETE
  components/
    layout/SiteHeader.tsx       App name + main navigation
    layout/NavLinks.tsx         Section links (Tasks), highlights the active one
    tasks/TaskCard.tsx          Title, description preview, date, Edit/Delete
    tasks/TaskDescription.tsx   Clamped description with "Show more"
    tasks/TaskActions.tsx       Edit/Delete buttons; opens the matching dialog
    tasks/NewTaskButton.tsx     Opens the create dialog
    tasks/TaskFormDialog.tsx    Create/edit dialog (wraps TaskForm)
    tasks/TaskForm.tsx          Shared create/edit form (useActionState → API)
    tasks/DeleteTaskDialog.tsx  Delete confirmation dialog
    tasks/SearchBar.tsx         Live search (debounced ?q= update; plain GET form without JS)
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
    tasks/service.ts            listTasks, countTasks, getTask, create/update/deleteTask
    tasks/api-client.ts         Browser fetch wrappers for /api/tasks (never throw)
    format.ts                   Date formatting for display
scripts/
  seed.mjs                      Inserts N sample tasks (performance testing)
data/
  tasks.db                      SQLite file (git-ignored, created automatically)
```

### 2.3 Pages and interactions

| URL | Page | Data |
|---|---|---|
| `/?q=` | **Home** (everyday workspace, titled "Your tasks"): search box at the top, a "New task" button, the 10 newest matching tasks with Edit/Delete, and a link to the full list in Tasks | `service.listTasks` (page size 10), `service.countTasks` |
| `/tasks?q=&page=` | **Tasks**: all tasks, with live search and pagination (20 per page) | `service.listTasks` |

Home "mirrors" Tasks partially: same search, same cards and dialogs, but only the first 10 results and no pagination. The **Tasks** header link stays, because more sections (projects, categories, …) will join it in the header.

Create, edit, and delete happen **on the current page**. There are no separate form pages.

| Action | Clicks | UI | API |
|---|---|---|---|
| Create | 1 + save | "New task" (Home and Tasks) → `TaskFormDialog` | `POST /api/tasks` |
| Search | 0: just type | `SearchBar` updates `?q=` 250 ms after the last keystroke | page re-render |
| Edit | 1 + save | "Edit" on a card → `TaskFormDialog` (pre-filled) | `PATCH /api/tasks/:id` |
| Delete | 1 + confirm | "Delete" on a card → `DeleteTaskDialog` (names the task, warns it's permanent) | `DELETE /api/tasks/:id` |

After a successful call the client runs `router.refresh()`, so the current page re-renders on the server with fresh data. The dialog then closes and a toast confirms the action. On error the dialog stays open, showing field errors, and the values the user typed are kept.

### 2.4 API

All responses are JSON. Errors always have the shape `{ "error": string, "errors"?: { field: message } }`.

| Method & path | Body | Success | Errors |
|---|---|---|---|
| `GET /api/tasks?q=&page=&pageSize=` | | `200` `Page<Task>` (`items`, `total`, `page`, `pageSize`, `totalPages`), newest first | |
| `POST /api/tasks` | `{ title, description? }` | `201` `Task`, `Location` header | `400` validation, `415` not JSON |
| `GET /api/tasks/:id` | | `200` `Task` | `404` |
| `PATCH /api/tasks/:id` | `{ title?, description? }` (omitted fields keep their value) | `200` `Task` | `400`, `404`, `415` |
| `DELETE /api/tasks/:id` | | `204` | `404` |

- `page` is clamped to the valid range, and `pageSize` defaults to 20 (max 100).
- Write requests must be sent as `Content-Type: application/json`. This also blocks cross-site form posts (CSRF), because browsers send that content type to another origin only after a CORS preflight, which the API never allows.
- Unexpected errors are logged on the server and returned as `500` with a generic message.

### 2.5 Data model

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
| Invalid IDs | The API parses `id` as a positive integer; anything else returns a 404, never a database error |
| Malformed API requests | Non-JSON bodies get a 415, invalid JSON or non-object bodies a 400; unknown fields are ignored; unexpected errors become a logged 500 with a generic message |
| Cross-site requests (CSRF) | Writes require `Content-Type: application/json`, which a foreign site can't send without a CORS preflight that the API never allows |
| Lost user input on error | When validation fails, the dialog stays open with the typed values and field-level messages |
| Accidental deletion | A confirmation dialog that names the task is required before a delete |
| Accidental commit of data | `data/` and `*.db*` are in `.gitignore` |
| Backups | The README documents a safe backup method (`sqlite3 data/tasks.db ".backup backup.db"`, or copying the file while the app is stopped) |

---

## 4. Performance / responsiveness

- **Server rendering:** pages are Server Components that read SQLite directly, so lists arrive as HTML with no client-side data fetching. The browser only calls the API to write.
- **Prepared statements:** compiled once and reused; SQLite runs in-process, so there is no network round-trip.
- **Pagination:** the list shows 20 tasks per page using `LIMIT/OFFSET`, with the index on `(created_at, id)`. The browser never renders thousands of items at once.
- **Search:** case-insensitive `LIKE` over title and description, run on the server. This is fast enough for a personal dataset. If needed later, it can be upgraded to SQLite **FTS5** without changing the UI.
- **Live search without flicker:** the search box waits 250 ms after the last keystroke, then replaces `?q=` inside a React transition. The current list stays on screen (with a small spinner in the box) until the new one is ready, and the input keeps its focus and text, because Next.js preserves page state when only search params change.
- **Streaming:** `loading.tsx` shows a skeleton right away when navigating to the Tasks page.
- **Prefetching:** `<Link>` prefetches pages, so moving between Home and Tasks feels instant.
- **No freezing:**
  - All database work happens on the server, never in the browser.
  - Submit buttons show a pending state and are disabled while saving, which prevents double submits.
  - Long text is truncated in the list with CSS (`line-clamp`).
- **Small bundles:** only interactive pieces (search box, dialogs, buttons, toast) are client components, and no UI libraries are used.

---

## 5. UX / layout

- **Responsive, mobile-first layout:**
  - Content is in a single centred column (max width about 760px) with comfortable spacing.
  - On wide screens the list uses a roomier card layout.
  - On phones there is a 16px side gutter and no horizontal scrolling.
- **Navigation:** a sticky header shows the logo and app name, which link to **Home**, and a **Tasks** link, highlighted when active. Future sections (projects, categories, …) are added as more header links.
- **Home (everyday workspace, fewest clicks):**
  - Header: a small "Your day, organised" line, the "Your tasks" title, and a one-line subtitle, with the "New task" button opposite (it moves below the title on phones).
  - Under it, the search box in its own card with a visible "Search tasks" label. Results update as you type; "Clear" resets them.
  - A summary line above the list, e.g. "2 tasks · Newest first" or "Showing 10 of 54 tasks matching “milk” · Newest first".
  - The 10 newest matching tasks, with Edit/Delete on each card.
  - A "See all N in Tasks" link (keeps the search), shown when there are more than 10 matches.
- **Dialogs:**
  - Create and edit use the same form dialog. Delete uses a confirmation dialog that names the task.
  - They use the native `<dialog>`: focus stays inside, Escape and backdrop clicks close it, and focus returns to the button that opened it.
  - On phones the dialog becomes a bottom sheet.
- **Tasks page (full list):**
  - A "New task" button and the same live search box as Home.
  - A result count, for example "Showing 21–40 of 312".
  - Each card (same on Home) shows the title, a 3-line description preview (with "Show more", omitted when empty), and the created or updated date on the left, with Edit and a quiet Delete on the right (below on phones).
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
5. **API:** `app/api/http.ts` helpers, `app/api/tasks/route.ts` (list, create), and `app/api/tasks/[id]/route.ts` (read, update, delete).
6. **Task pages:** the Tasks list (with search and pagination), `loading.tsx`, `error.tsx`, and `not-found` pages.
7. **Dialogs and mutations:** `lib/tasks/api-client.ts`, `TaskForm` + `TaskFormDialog` (create and edit), and `DeleteTaskDialog`.
8. **Home workspace:** live `SearchBar` (shared with Tasks), "New task" button, and the Home list.
9. **Polish:** toasts, empty states, a responsive check, and an accessibility pass.
10. **Docs:** `README.md` and JSDoc review.
11. **Verification** (see section 8).

---

## 8. Verifications

**Static checks**
- [ ] `npm run typecheck`: no TypeScript errors
- [ ] `npm run lint`: no ESLint errors
- [ ] `npm run build`: production build succeeds

**Functional (manual, in the browser, using `npm run dev` and then `npm start`)**
- [ ] The first run creates `data/tasks.db` automatically, and Home shows a count of 0 and the empty state
- [ ] The logo leads to Home, and the Tasks link is highlighted on the Tasks page
- [ ] Live search on Home and Tasks: results update while typing (no Enter needed), the input keeps focus and text, "Clear" resets the list, and back/forward restores the matching search text
- [ ] Home shows at most 10 tasks and "See all in Tasks" opens the Tasks page with the same search
- [ ] Create a task with "New task" on Home and on Tasks: the dialog opens without leaving the page, closes on save, a toast appears, and the list updates
- [ ] An empty or whitespace-only title, or a title over 200 characters, shows a field error in the dialog, and the typed values are kept
- [ ] Edit a task in its dialog (pre-filled): the changes are saved, the card shows "Updated", and a toast appears
- [ ] Escape, the × button, or a backdrop click closes a dialog without saving, and focus returns to the button that opened it
- [ ] Delete: the confirmation dialog names the task, Cancel keeps it, and Delete removes it with a toast, on the same page
- [ ] All of the above also works on the Tasks page, including inside search results
- [ ] Unknown URLs show the 404 page, and database errors show the error page with "Try again"

**API (with `curl` or similar)**
- [ ] `POST /api/tasks` returns `201` with the task and a `Location` header; a blank title returns `400` with `errors.title`
- [ ] `GET /api/tasks?q=&page=&pageSize=` returns a `Page<Task>`; an out-of-range `page` is clamped
- [ ] `GET /api/tasks/:id` returns the task; an unknown or non-numeric id returns `404`
- [ ] `PATCH /api/tasks/:id` with only `description` keeps the title and bumps `updatedAt`
- [ ] `DELETE /api/tasks/:id` returns `204`, and a second delete returns `404`
- [ ] A write with `Content-Type: text/plain` returns `415`; invalid JSON or a JSON array returns `400`

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
