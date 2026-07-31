# Production image: the frontend is built here and served by the backend itself, so a
# deployment is just this image plus postgres - no separate nginx, and no host-built
# frontend/dist/ to remember to rebuild. Build context is the repo root because both
# backend/ and frontend/ are needed.
#
# The dev setup (docker-compose.yml) does not use this file - it keeps the Vite dev
# server in frontend/Dockerfile for HMR.

FROM node:22-alpine AS frontend-build
WORKDIR /build
# package files first so the npm ci layer stays cached when only source changes
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# VITE_API_BASE_URL is deliberately not set: the API client falls back to relative
# /api/... paths, which is what same-origin serving needs.
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY --from=frontend-build /build/dist ./static
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
