# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

Communicate with the user in Traditional Chinese (繁體中文) in this repository, matching README.md.
Keep code, identifiers, and comments in English as usual.

PR titles and descriptions must also be written in Traditional Chinese, using full-width punctuation
（`，`「」`（）`）rather than half-width `,` `()` `:`. PR titles follow the same subject rules as commit
messages — see "Commit messages and PR titles" under Git workflow.

`gh pr edit` fails on this repo with a `Projects (classic)` GraphQL deprecation error, even for
unrelated field edits. Use `gh api repos/<owner>/<repo>/pulls/<n> -X PATCH -f title=... -f body=...`
instead.

## Git workflow

Land changes via a feature branch + PR, merged into `main` on GitHub — not direct commits to `main`.
This applies even to small changes (e.g. doc-only updates). Every change so far, including prior
doc-only updates, has followed this path.

### Branch naming

Branches are named `<type>/<kebab-case-description>`, where `<type>` is one of `feat`, `fix`, `docs`,
`chore`. The description is lowercase English words joined by hyphens — e.g. `feat/backup-automation`,
`fix/alembic-merge-heads`, `docs/update-readme-features-env`, `chore/cleanup-legacy-css`.

**Worktrees are the one thing that breaks this.** Claude Code names a new worktree's branch
`worktree-<name>` or `worktree-bridge-cse_<id>`, and several of those have been pushed to `origin` as
is. Before pushing from a worktree, either rename the branch (`git branch -m feat/whatever`) or push
under the right name explicitly (`git push -u origin HEAD:feat/whatever`) — the `worktree-` prefix
must never reach `origin`.

### Commit messages and PR titles

- Subject line: Traditional Chinese, starting with a verb — `新增` / `修正` / `更新` / `移除` / `文件`.
  **No prefix label.** Do not use Conventional Commits (`feat:` / `fix:`), and do not use the older
  Chinese label style (`文件：` / `chore：`).
- Punctuation inside the subject is full-width（`，`「」`（）`）, never half-width `,` `()` `:`.
  English identifiers embedded in the sentence stay as they are (e.g. `shadcn/ui`, `pg_dump`).
- Do not hand-write an issue or PR number in the subject. Link the issue from the body with
  `Closes #N` instead. The `(#NN)` that GitHub appends when a PR is squash-merged is tool behaviour,
  not a violation, and should not be stripped afterwards.
- The body explains *why* the change was made rather than restating the diff, and keeps the existing
  `Co-Authored-By:` trailer.

A good example, from the daily-backup commit:
`新增每日備份 script（本機 pg_dump + tar，保留 30 天）`

### Release tags

Tags use semver, `vMAJOR.MINOR.PATCH` (e.g. `v0.1.0`), cut from `main`. The repo has no tags yet —
when the first one is warranted, confirm the version number with the user before pushing it.

### Historical exceptions

Branches merged before PR #31 (`feature-issue-*`, `fix-about-heading`, `theme-blue-dark-light-toggle`,
`worktree-*`) and early commit subjects (`文件：`, `chore：`, `fix: `, plain-English subjects such as
`Add file upload/download API`) predate these rules. They are left as they are — rewriting them would
rewrite published history — so do not treat them as examples to follow.

## Project overview

py-file-platform is a file management/sharing platform, positioned like a public document wall for a
club or internal team: guests can browse and download public files without logging in; logging in is
only required to upload or manage files. It exists primarily to exercise a Python backend's CRUD/API
handling against a React frontend.

Implemented: local-account and LDAP login/JWT auth, file upload/download with per-file public/private
visibility and version history, folder-grouped browsing, link-card categories, site branding settings,
admin-editable homepage feature highlights, self-service password reset, admin user management, an
audit log for high-privilege actions, and
upload notifications — see README.md for the full feature list. Upload notifications now have a
frontend too: `frontend/src/components/NotificationBell.tsx` (mounted in `App.tsx`) calls
`GET/PATCH /api/notifications` via `frontend/src/api/notifications.ts`. `AboutPage.tsx` no longer has
a "尚未實作" section — LDAP and upload notifications are both listed under "已實作功能".

LDAP config (server URI, bind DN/password, base DN, user search filter) is admin-editable at runtime
via the "LDAP 設定" tab in `/admin`, backed by the single-row `ldap_settings` DB table rather than
env vars alone — see `app/core/ldap_config.py` and `app/api/ldap_settings.py`. The `LDAP_*` env vars in
`.env` only seed that row's initial values the first time it's read; after that, edits go through the
admin UI/API, not the env file.

Stack: FastAPI (backend) + React/Vite (frontend) + PostgreSQL, deployed via docker-compose. Backend
and frontend are both wired end-to-end (API routes, pages, and test suites all exist) rather than a
skeleton.

## Commands

### Backend (`backend/`)

A venv already exists at `backend/venv` (created with `uv`, Python 3.12).

```bash
cd backend
source venv/bin/activate

# run the dev server (reads DATABASE_URL etc. from ../.env)
uvicorn app.main:app --reload

# apply migrations
alembic upgrade head

# create a new migration after changing a model in app/models/
alembic revision --autogenerate -m "description"

# run the test suite
pytest
```

### Frontend (`frontend/`)

```bash
cd frontend
npm install
npm run dev      # vite dev server on :5173
npm run build     # tsc -b && vite build
npm run lint      # oxlint
npm test          # vitest run
```

### Full stack via Docker

```bash
docker compose up --build
```

Runs three services: `db` (postgres:16-alpine), `backend` (uvicorn on :8000, runs `alembic upgrade
head` on container start — see `backend/Dockerfile`), `frontend` (vite dev server on :5173). The
`./uploads` host directory is bind-mounted into the backend container so uploaded files survive
container rebuilds.

## Configuration

A single `.env` at the **project root** (not inside `backend/`) is the source of truth for both
native and Docker dev — see `.env.example`. Notably:

- `backend/app/core/config.py` locates this root `.env` by walking up three parents from its own file
  path, so `Settings()` works the same whether uvicorn is run from `backend/` natively or the app runs
  inside the Docker container.
- `DATABASE_URL` differs between native dev and full docker-compose: use `localhost` when uvicorn runs
  on the host against a dockerized `db`, use host `db` when the backend itself also runs in Docker
  (docker-compose overrides `DATABASE_URL` via the `environment:` block for this reason — see
  `docker-compose.yml`).

## Backend architecture

- `app/main.py` — FastAPI app entrypoint; mounts the single router from `app/api/router.py`.
- `app/api/router.py` — `APIRouter(prefix="/api")` that includes the feature routers, each a separate
  module under `app/api/`: `auth.py` (login/JWT — local password or LDAP bind via `app/core/ldap.py`,
  `/me`), `files.py` (upload/download, versions, visibility toggle, folder-grouped listing, fires
  upload notifications), `folders.py` (card CRUD, admin-only writes via `require_admin`), `link_cards.py`
  (admin-managed external link cards, grouped like files by folder), `highlights.py` (the feature
  highlight cards on the home page — same public-`GET`/admin-only-writes shape as `link_cards.py`;
  `icon` stores a kebab-case string key validated by the `HighlightIconKey` `Literal` in
  `app/schemas/highlight.py`, which `frontend/src/lib/highlight-icons.ts` maps to lucide components
  with a fallback, so the two lists must be kept in sync), `site_settings.py` (branding
  text and the per-file upload limit `max_upload_size_mb`, admin-only writes, plus
  admin-uploaded favicon/hero images — those live in
  `UPLOAD_DIR/branding/` and are served by the **public, unauthenticated**
  `GET /api/site-settings/assets/{filename}` route, the one exception to this app's
  everything-goes-through-an-authenticated-`FileResponse` rule, because a favicon has to load
  before login), `ldap_settings.py` (LDAP config CRUD, `GET`+`PATCH` both admin-only since
  it exposes infra details, unlike `site_settings.py`'s public `GET` — never returns the bind password
  itself, only whether one is set), `smtp_settings.py` (outgoing-mail SMTP config CRUD, same
  admin-only-`GET`+`PATCH` pattern and password-never-returned behavior as `ldap_settings.py`),
  `password_reset.py` (self-service forgot/reset-password flow, emails a token link via
  `app/core/mailer.py`), `notifications.py` (`GET`/`PATCH` on a user's own `Notification` rows —
  consumed by `frontend/src/components/NotificationBell.tsx`), `admin.py` (user management, gated by
  `require_admin` in `deps.py`).
- `app/core/config.py` — pydantic-settings `Settings`, loaded once as the module-level `settings`
  singleton and imported wherever config is needed. Its `LDAP_*` and `SMTP_*` fields are only used to
  seed the DB-backed `ldap_settings`/`smtp_settings` rows on first read (see `app/core/ldap_config.py`,
  `app/core/smtp_config.py`), not read directly by login/auth or mail-sending code.
- `app/core/ldap_config.py` — `get_ldap_settings(db)` fetches the single-row `LdapSetting`, creating it
  (seeded from `settings.ldap_*`) on first call. Used by both `app/api/auth.py` (to check `enabled` and
  build the `authenticate_ldap()` config) and `app/api/ldap_settings.py`.
- `app/core/smtp_config.py` — `get_smtp_settings(db)` fetches the single-row `SmtpSetting`, creating it
  (seeded from `settings.smtp_*`) on first call, same pattern as `ldap_config.py`. Also exposes
  `SmtpConfig`/`to_smtp_config()`, a plain dataclass snapshot of that row: callers fetch it inside the
  request (while the DB session is open) and hand it to `app/core/mailer.py`'s `send_email()` /
  `send_upload_notification_emails()` via `BackgroundTasks.add_task`, since those run after the
  request's session has already closed and can't safely re-query the ORM row themselves.
- `app/core/upload_limit.py` — `get_max_upload_size_mb(db)` reads the admin-editable per-file limit off
  the `site_settings` row, falling back to `settings.max_upload_size_mb` while it's still `NULL`.
  Deliberately a plain read rather than the get-or-create used by `ldap_config.py`/`smtp_config.py`:
  it runs on every upload, so the seeding lives on the admin read path
  (`_get_or_create_settings` in `app/api/site_settings.py`) instead. Also defines
  `MAX_UPLOAD_SIZE_MB_CEILING` (512), the value the schema validates against — `nginx/nginx.conf`'s
  `client_max_body_size` and `MAX_UPLOAD_SIZE_MB_CEILING` in
  `frontend/src/pages/admin/useSiteSettingsAdmin.ts` hardcode the same number and must be changed
  together.
- `app/core/database.py` — SQLAlchemy engine/session setup; `Base` (DeclarativeBase) that all models
  inherit from, and a `get_db()` generator intended for use as a FastAPI dependency.
- `app/models/` — one file per table (`User`, `File`, `FileVersion`, `Folder`, `LinkCard`, `Highlight`,
  `SiteSetting`, `LdapSetting`, `SmtpSetting`, `PasswordResetToken`, `Notification`, `AuditLog`), all
  imported and re-exported from `app/models/__init__.py`. Alembic's `env.py` does `from app.models
  import *` so every model must be added to that `__init__.py` to be picked up by autogenerate.

Data model relationships: `File.owner_id` → `User.id`; `File.folder_id` → `Folder.id` (nullable; a
"card" grouping with name/description, admin-managed, that any file owner can assign their own files
into); `FileVersion.file_id` → `File.id` (one row per uploaded version of a file, enabling the "don't
overwrite, keep version history" behavior described in the README); `AuditLog.actor_id` → `User.id`
records high-privilege admin actions. File content itself lives on disk under `UPLOAD_DIR`/`uploads/`
— the DB only stores metadata and `FileVersion.stored_path`. `SiteSetting.favicon_filename` /
`hero_image_filename` follow the same split: bare uuid filenames in the DB, bytes under
`UPLOAD_DIR/branding/`, with the response schema deriving the public URL from the filename. `File.display_name` and
`File.announced_at` are display-only metadata (editable by the owner or an admin via `PATCH
/api/files/{id}`) and don't affect the real `filename` used for downloads or version matching.
`Highlight` has no foreign keys at all — rows are ordered by `sort_order` (ties broken by `id`), and
the four cards that used to be hardcoded in `HomePage.tsx` are seeded by migration `c9d3e17a4b52`.
Tests won't see those seeded rows: `backend/tests/conftest.py` builds its schema with
`Base.metadata.create_all`, not by running migrations.

## Frontend architecture

Vite + React 19 + TypeScript + `react-router-dom` v7. Routing is defined in `App.tsx` with routes for
`/`, `/login`, `/forgot-password`, `/reset-password`, `/upload`, `/profile`, `/about`, and `/admin`
(→ `HomePage`, `LoginPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `UploadPage`, `ProfilePage`,
`AboutPage`, `AdminPage`), all wired to the backend API via `src/api/` (`auth.ts`, `files.ts`,
`folders.ts`, `admin.ts`, `client.ts`); `AuthContext.tsx` holds the logged-in user and JWT. `/upload`
and `/profile` are gated to any logged-in user and `/admin` to admin users specifically (all redirect
to `/login` otherwise, gated client-side). Linting uses `oxlint` (config in `.oxlintrc.json`), not
eslint.

`AdminPage.tsx` is only the shell: the stat cards and the nine `<Tabs>` triggers. Each tab is a pair
of files under `src/pages/admin/` — `useXxxAdmin.ts` (state, loaders, handlers) and `XxxTab.tsx` (the
markup, taking the hook's return value as its props). The hooks are called by `AdminPage`, not by the
tab components, because the stat cards read the user and file totals from outside `<Tabs>`, tabs
depend on each other (the 連結卡片 folder picker reads the folder list, mutations refresh the audit
log, deleting a folder re-lists files), and Radix unmounts the inactive `TabsContent` — state held
inside a tab would drop unsaved LDAP/SMTP edits every time the admin switched away. `AdminPage.test.tsx`
stays a single suite driving the whole page, which is what makes it a safety net for changes to any
one tab.

### Design system

Everything visual comes from the tokens in `frontend/src/index.css` — the point of the pass in PR #93
was to stop pages hand-rolling their own sizes, shadows and error text. New UI should reach for the
existing token or shared component rather than a one-off Tailwind class.

- **Surfaces.** `--canvas` is the page backdrop *outside* the content sheet (it is what `:root` sets
  as `background`); `--background` and `--card` are the sheet and the cards on it. The neutrals are
  not pure grey: they carry chroma 0.005–0.014 of the primary hue so they don't read as dead grey
  next to the blue primary. Any new neutral has to be mixed the same way.
- **Elevation.** Three steps, `--elevation-1/2/3`. The `@theme inline` block remaps the stock shadow
  scale onto them, so `shadow-xs`/`shadow-sm` → step 1, `shadow-md` → step 2, `shadow-lg` and above →
  step 3, and all of them are theme-aware for free. In dark mode each step also carries an inset top
  hairline, because a black drop shadow is invisible on a near-black surface. Don't write
  `shadow-[...]` by hand.
- **Type scale.** `text-display` / `text-title` / `text-section` / `text-sub`, each carrying size,
  leading, tracking and weight in one class. The un-scoped `h1`/`h2` element rules are gone (their
  margins stacked onto container flex gaps), so headings must opt in — in practice via `PageHeader`
  and `SectionTitle` rather than a hand-written `text-2xl font-bold`.
- **Layout and fonts.** `@utility page` is the standard page container (column flex, page rhythm and
  responsive padding); `App.tsx` uses `max-w-app` (`--container-app`) for the shell width. `--sans`
  (and `font-heading`, which currently aliases it) is a system-font stack with an explicit zh-Hant
  fallback chain — nothing is downloaded, but without that chain Traditional Chinese drops to a
  Ming/serif face on Windows and Linux.
- **Status vocabulary.** Inline messages go through `Callout` (`destructive` / `success` / `info`),
  never a bare `<p className="text-destructive">`; empty lists through `EmptyState`; loading
  placeholders through `ui/skeleton`; the result of an action through a `sonner` toast. For
  destructive buttons, `destructive-outline` is the per-row variant (a red hint without turning a
  table red) and solid `destructive` is reserved for the confirm dialog, where the action really is
  consequential.

Shared components in `frontend/src/components/` (the `ui/` subdirectory is shadcn's, generally left
as generated):

| Component | Use for |
| --- | --- |
| `PageHeader` | The `<h1>` block at the top of a page, with optional description and actions. |
| `SectionTitle` | Card and section headings; `as` picks `h2`/`h3`/`h4`, `size` picks the type step. |
| `Callout` | Inline error/success/info messages inside a form or tab. |
| `EmptyState` | The dashed placeholder for a list with no rows. |
| `AuthLayout` | The centred card shell shared by login, forgot-password and reset-password. |
| `ui/badge` | Status pills (`success` / `warning` / `destructive` / `outline` / …). |
| `ui/skeleton` | Loading placeholders. |

`PageHeader` and `SectionTitle` deliberately render real heading elements: a number of tests locate
pages and sections with `getByRole("heading")`, and shadcn's `CardTitle` renders a `<div>`.
`SectionTitle` also keeps `data-slot="card-title"` so `CardHeader`'s grid still lays out correctly
when a `CardAction` sits beside it. `Callout` returns `null` for falsy `children` (so a caller can
pass a possibly-empty error string straight in) and switches its `role` between `alert`
(destructive) and `status` (the rest), so a screen reader doesn't announce an info box as an alert —
neither behaviour is incidental.
