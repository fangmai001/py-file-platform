// role 的值（user／admin）是 API 的一部分，送出去的必須維持英文；這裡只負責顯示用的中文對照，
// 與 lib/audit-actions.ts、lib/highlight-icons.ts 是同一套做法。
const ROLE_LABELS: Record<string, string> = {
  user: "一般使用者",
  admin: "管理員",
};

/** role 的中文標籤；遇到未知的值就退回原字串。 */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
