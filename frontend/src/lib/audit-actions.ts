// 稽核紀錄的 action 是後端寫死的字串 key（見 backend/app/api/ 各處的 log_action 呼叫）。
// 直接把 key 顯示在畫面上，對非技術背景的管理員來說等於看不懂自己在看什麼，所以這裡做一層
// 中文對照——與 lib/highlight-icons.ts 的 highlightIconLabel() 是同一套做法。
const AUDIT_ACTION_LABELS: Record<string, string> = {
  "user.create": "建立使用者",
  "user.update": "編輯使用者",
  "user.delete": "刪除使用者",
  "user.password_reset": "管理員重設密碼",
  "user.self_update": "使用者自行修改資料",
  "user.self_password_change": "使用者自行變更密碼",
  "user.self_password_reset": "使用者以信件重設密碼",
  "file.delete": "刪除檔案",
  "folder.create": "建立資料夾",
  "folder.update": "編輯資料夾",
  "folder.delete": "刪除資料夾",
  "link_card.create": "建立連結卡片",
  "link_card.update": "編輯連結卡片",
  "link_card.delete": "刪除連結卡片",
  "highlight.create": "建立首頁特色",
  "highlight.update": "編輯首頁特色",
  "highlight.delete": "刪除首頁特色",
  "site_settings.update": "更新站台設定",
  "ldap_settings.update": "更新 LDAP 設定",
  "smtp_settings.update": "更新 SMTP 設定",
};

/**
 * action key 的中文標籤；遇到未知的值就退回 key 本身。
 *
 * fallback 不能省：篩選器的選項是從實際的資料列即時算出來的
 *（useAuditLogsAdmin 的 auditActions），後端哪天多記一種 action，這裡還沒補上對照，
 * 畫面也不該變成空白。
 */
export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
