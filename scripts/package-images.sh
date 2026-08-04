#!/usr/bin/env bash
set -euo pipefail

# Packs the two production images into separate tars for offline delivery, plus a
# sha256 manifest. They stay separate on purpose: the app image changes every
# release while postgres is pinned, so day-to-day updates only have to carry the
# app tar (~70 MB) instead of both (~180 MB). The two images share no layers -
# python:3.12-slim vs alpine - so merging them would save nothing anyway.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"
COMPOSE_FILE="$REPO_ROOT/docker-compose.prod.yml"

log() {
  printf '%s [%s] %s\n' "$(date -Iseconds)" "$1" "$2"
}

usage() {
  cat <<'USAGE'
Usage: scripts/package-images.sh [--app-only]

  --app-only  Skip the postgres tar and only rebuild/save the app image. Use this
              for routine releases - postgres is pinned, so the offline host only
              needs its tar the first time (or when the pinned version changes).
USAGE
}

# Only ever reads KEY=value lines by regex - never sourced, so .env content is
# never executed as shell code.
env_get() {
  local val
  val=$(grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | tail -n1 | cut -d'=' -f2-)
  echo "${val:-${2:-}}"
}

# Resolves a possibly-relative path against REPO_ROOT, so values like "./release"
# behave the same regardless of the cwd this script was invoked from.
resolve_path() {
  case "$1" in
    /*) echo "$1" ;;
    *) echo "$REPO_ROOT/${1#./}" ;;
  esac
}

APP_ONLY=false
while [ $# -gt 0 ]; do
  case "$1" in
    --app-only) APP_ONLY=true ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; log ERROR "Unknown argument: $1"; exit 1 ;;
  esac
  shift
done

APP_VERSION="$(env_get APP_VERSION)"
OUTPUT_DIR="$(resolve_path "$(env_get PACKAGE_OUTPUT_DIR ./release)")"

# No fallback on purpose. The version lands in the tar filename, the image tag on the
# offline host and the tag compose resolves - so an unset or shared value means the next
# release overwrites the previous tar, re-points the tag, and leaves nothing to roll back
# to. Better to refuse here than to hand over a delivery that can only go forwards.
if [ -z "$APP_VERSION" ]; then
  log ERROR "APP_VERSION is not set in $ENV_FILE - set it to the release version (e.g. v0.1.0)"
  exit 1
fi
if [ "$APP_VERSION" = "latest" ]; then
  log ERROR "APP_VERSION=latest is not allowed - every release would overwrite the previous tar and image tag, leaving no version to roll back to. Set a real version (e.g. v0.1.0)."
  exit 1
fi
# Docker's tag charset, which is also what keeps the tar filename sane - a "/" or a space
# would silently produce a broken path below.
if ! printf '%s' "$APP_VERSION" | grep -qE '^[A-Za-z0-9_][A-Za-z0-9._-]*$'; then
  log ERROR "APP_VERSION='$APP_VERSION' is not a valid image tag - use only letters, digits, '.', '_' and '-' (e.g. v0.1.0)"
  exit 1
fi

# Exported so compose interpolates the same tag we stamp into the tar filename and pass
# as a build arg.
export APP_VERSION

APP_IMAGE="py-file-platform-app:${APP_VERSION}"
# The db image is read back out of the compose file rather than written down a
# second time here, so docker-compose.prod.yml stays the single source of truth
# for which postgres version this deployment pins.
DB_IMAGE="$(docker compose -f "$COMPOSE_FILE" config --images | grep -vFx "$APP_IMAGE" | head -n1)"
if [ -z "$DB_IMAGE" ]; then
  log ERROR "Could not resolve the db image from $COMPOSE_FILE"
  exit 1
fi

# Both tars share the py-file-platform- prefix so a delivery sorts together in a
# listing; the db one keeps the upstream image name so its provenance (and which
# version to check CVEs against) survives the trip.
APP_TAR="$OUTPUT_DIR/py-file-platform-app-${APP_VERSION}.tar"
DB_TAR="$OUTPUT_DIR/py-file-platform-db-$(echo "$DB_IMAGE" | tr ':/' '--').tar"

mkdir -p "$OUTPUT_DIR"

log INFO "Building $APP_IMAGE"
docker compose -f "$COMPOSE_FILE" build

log INFO "Saving $APP_IMAGE to $APP_TAR"
docker save "$APP_IMAGE" -o "$APP_TAR"

if [ "$APP_ONLY" = true ]; then
  log INFO "Skipping $DB_IMAGE (--app-only)"
else
  log INFO "Saving $DB_IMAGE to $DB_TAR"
  docker save "$DB_IMAGE" -o "$DB_TAR"
fi

# The manifest covers only this delivery's tars, not everything left in the output
# directory from earlier releases, so `sha256sum -c` on the offline host checks
# exactly the set that was handed over.
MANIFEST_FILES=("$(basename "$APP_TAR")")
if [ -f "$DB_TAR" ]; then
  MANIFEST_FILES+=("$(basename "$DB_TAR")")
else
  log WARN "$(basename "$DB_TAR") is not in $OUTPUT_DIR - manifest covers the app tar only"
fi

log INFO "Writing $OUTPUT_DIR/MANIFEST.sha256"
(cd "$OUTPUT_DIR" && sha256sum "${MANIFEST_FILES[@]}" > MANIFEST.sha256)

log INFO "Done - transfer these to the offline host along with docker-compose.prod.yml and .env:"
(cd "$OUTPUT_DIR" && ls -lh "${MANIFEST_FILES[@]}" MANIFEST.sha256)
