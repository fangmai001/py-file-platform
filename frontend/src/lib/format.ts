/** 人類可讀的位元組數，例如 1536 -> "1.5 KB"。從 HomePage 抽出來的。 */
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

/** 絕對的本地時間戳記，用於 tooltip 與表格儲存格。 */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-TW");
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * 近期事件用的相對時間；超過一週就退回絕對格式——隔那麼久之後，
 * 「8 天前」反而不如實際日期來得有用。
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
