# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

Communicate with the user in Traditional Chinese (繁體中文) in this repository, matching README.md.
Keep code, identifiers, and comments in English as usual.

PR titles and descriptions must also be written in Traditional Chinese.

`gh pr edit` fails on this repo with a `Projects (classic)` GraphQL deprecation error, even for
unrelated field edits. Use `gh api repos/<owner>/<repo>/pulls/<n> -X PATCH -f title=... -f body=...`
instead.

## Git workflow

Land changes via a feature branch + PR, merged into `main` on GitHub — not direct commits to `main`.
This applies even to small changes (e.g. doc-only updates). Every change so far, including prior
doc-only updates, has followed this path.

## Project overview

py-file-platform is a file management/sharing platform, positioned like a public document wall for a
club or internal team: guests can browse and download public files without logging in; logging in is
only required to upload or manage files. It exists primarily to exercise a Python backend's CRUD/API
handling against a React frontend.

Implemented: local-account login/JWT auth, file upload/download with per-file public/private
visibility and version history, folder-grouped browsing, admin user management, and an audit log for
high-privilege actions (see README.md for the full feature list). Not yet implemented: LDAP auth and
upload notifications (email + in-app).

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
  module under `app/api/`: `auth.py` (login/JWT, `/me`), `files.py` (upload/download, versions,
  visibility toggle, folder-grouped listing), `admin.py` (user management, gated by `require_admin` in
  `deps.py`).
- `app/core/config.py` — pydantic-settings `Settings`, loaded once as the module-level `settings`
  singleton and imported wherever config is needed.
- `app/core/database.py` — SQLAlchemy engine/session setup; `Base` (DeclarativeBase) that all models
  inherit from, and a `get_db()` generator intended for use as a FastAPI dependency.
- `app/models/` — one file per table (`User`, `File`, `FileVersion`, `AuditLog`), all imported and
  re-exported from `app/models/__init__.py`. Alembic's `env.py` does `from app.models import *` so
  every model must be added to that `__init__.py` to be picked up by autogenerate.

Data model relationships: `File.owner_id` → `User.id`; `FileVersion.file_id` → `File.id` (one row per
uploaded version of a file, enabling the "don't overwrite, keep version history" behavior described in
the README); `AuditLog.actor_id` → `User.id` records high-privilege admin actions. File content itself
lives on disk under `UPLOAD_DIR`/`uploads/` — the DB only stores metadata and `FileVersion.stored_path`.

## Frontend architecture

Vite + React 19 + TypeScript + `react-router-dom` v7. Routing is defined in `App.tsx` with three
top-level routes (`/`, `/login`, `/admin` → `HomePage`, `LoginPage`, `AdminPage`), all wired to the
backend API via `src/api/` (`auth.ts`, `files.ts`, `admin.ts`, `client.ts`); `AuthContext.tsx` holds
the logged-in user and JWT. `/admin` is gated client-side to admin users (redirects to `/login`
otherwise). Linting uses `oxlint` (config in `.oxlintrc.json`), not eslint.
