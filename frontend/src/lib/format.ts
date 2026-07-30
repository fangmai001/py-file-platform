/** Human-readable byte count, e.g. 1536 -> "1.5 KB". Extracted from HomePage. */
export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

/** Absolute local timestamp, used for tooltips and table cells. */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-TW");
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Relative timestamp for recent events, falling back to the absolute form beyond a
 * week — at that distance "8 天前" is less useful than the actual date.
 */
export function formatRelativeTime(value: string): string {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) {
    return value;
  }
  const elapsed = Date.now() - then;
  if (elapsed < 0 || elapsed >= 7 * DAY) {
    return formatDateTime(value);
  }
  if (elapsed < MINUTE) {
    return "剛剛";
  }
  if (elapsed < HOUR) {
    return `${Math.floor(elapsed / MINUTE)} 分鐘前`;
  }
  if (elapsed < DAY) {
    return `${Math.floor(elapsed / HOUR)} 小時前`;
  }
  return `${Math.floor(elapsed / DAY)} 天前`;
}
