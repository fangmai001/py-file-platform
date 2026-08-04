#!/usr/bin/env bash
# Shared helpers for the scripts in this directory. Source it, don't execute it:
#
#   source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
#
# Paths are derived from this file's own location, so every script agrees on where the
# deployment root is no matter which cwd cron (or a person) invoked it from.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"
COMPOSE_FILE="$REPO_ROOT/docker-compose.prod.yml"

log() {
  printf '%s [%s] %s\n' "$(date -Iseconds)" "$1" "$2"
}

die() {
  log ERROR "$1"
  exit 1
}

# Fail loudly when .env is missing instead of letting every env_get fall back to its
# default. backup.sh is invoked by cron with its output appended to a log file, and the
# silent version of this looked like "someone deliberately turned backups off" rather than
# "the script is running from the wrong place".
require_env_file() {
  [ -f "$ENV_FILE" ] || die "$ENV_FILE not found - run this from the deployment root, or check the path in your crontab entry"
}

# Only ever reads KEY=value lines by regex - never sourced, so .env content is
# never executed as shell code.
env_get() {
  local val
  val=$(grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | tail -n1 | cut -d'=' -f2-)
  echo "${val:-${2:-}}"
}

# Resolves a possibly-relative path against REPO_ROOT, so values like "./backups"
# behave the same regardless of the cwd this script was invoked from.
resolve_path() {
  case "$1" in
    /*) echo "$1" ;;
    *) echo "$REPO_ROOT/${1#./}" ;;
  esac
}
