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

# Stamped last so bumping the version doesn't invalidate the pip/npm layers above.
#
# The env var is deliberately *not* called APP_VERSION: docker-compose.prod.yml gives the
# app `env_file: .env`, and env_file values override an image's ENV - so a same-named
# variable would make GET /health echo back whatever the deployer typed in .env instead
# of what was actually built. Under a different name the build stamp can't be shadowed,
# which is the whole point of being able to verify the running version over HTTP.
ARG APP_VERSION=dev
ENV APP_BUILD_VERSION=${APP_VERSION}
LABEL org.opencontainers.image.version=${APP_VERSION}

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
