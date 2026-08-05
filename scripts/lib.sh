#!/usr/bin/env bash
# 這個目錄底下各支 script 共用的輔助函式。請用 source 載入，不要直接執行：
#
#   source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
#
# 路徑是由本檔案自身的位置推導出來的，因此不論 cron（或人）是從哪個 cwd 呼叫，
# 每一支 script 對部署根目錄的認定都一致。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"
# 由 source 這個檔案的各支 script 使用，而不是 lib.sh 自己——shellcheck 單獨檢查本檔案時
# 正好看不到這一點。
# shellcheck disable=SC2034
COMPOSE_FILE="$REPO_ROOT/docker-compose.prod.yml"

log() {
  printf '%s [%s] %s\n' "$(date -Iseconds)" "$1" "$2"
}

die() {
  log ERROR "$1"
  exit 1
}

# .env 不存在時大聲失敗，而不是讓每一次 env_get 都默默退回預設值。backup.sh 是由 cron 呼叫、
# 輸出附加到 log 檔裡的，若靜默處理，看起來會像是「有人刻意把備份關掉了」，
# 而不是「這支 script 從錯誤的位置執行」。
require_env_file() {
  [ -f "$ENV_FILE" ] || die "$ENV_FILE not found - run this from the deployment root, or check the path in your crontab entry"
}

# 一律只以 regex 讀取 KEY=value 形式的行——絕不 source，因此 .env 的內容
# 永遠不會被當成 shell code 執行。
env_get() {
  local val
  val=$(grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | tail -n1 | cut -d'=' -f2-)
  echo "${val:-${2:-}}"
}

# 把可能是相對路徑的值對照 REPO_ROOT 解析出來，讓 "./backups" 這類值
# 不論這支 script 是從哪個 cwd 被呼叫都表現一致。
resolve_path() {
  case "$1" in
    /*) echo "$1" ;;
    *) echo "$REPO_ROOT/${1#./}" ;;
  esac
}
