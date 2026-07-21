# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

Communicate with the user in Traditional Chinese (繁體中文) in this repository, matching README.md.
Keep code, identifiers, and comments in English as usual.

## Project overview

py-file-platform is a file management/sharing platform, positioned like a public document wall for a
club or internal team: guests can browse and download public files without logging in; logging in is
only required to upload or manage files. It exists primarily to exercise a Python backend's CRUD/API
handling against a React frontend.

Planned features not yet implemented (see README.md for full details): per-file public/private
visibility toggle, and upload notifications (email + in-app). Auth is planned to support both
locally-created accounts and LDAP.

Stack: FastAPI (backend) + React/Vite (frontend) + PostgreSQL, deployed via docker-compose. The repo
is currently a skeleton — models and migrations exist, but there are no API routes, auth, or file
upload/download logic yet, and the frontend pages are unwired placeholders.

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
```

There is no test suite yet.

### Frontend (`frontend/`)

```bash
cd frontend
npm install
npm run dev      # vite dev server on :5173
npm run build     # tsc -b && vite build
npm run lint      # oxlint
```

There is no test suite yet.

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
- `app/api/router.py` — currently a placeholder `APIRouter(prefix="/api")` with no sub-routes. Future
  feature routers (auth, files, admin) are meant to be added as separate modules under `app/api/` and
  included here, per the comment in that file.
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
top-level routes (`/`, `/login`, `/admin` → `HomePage`, `LoginPage`, `AdminPage`), all currently
placeholder components with no API calls wired up. Linting uses `oxlint` (config in
`.oxlintrc.json`), not eslint.
