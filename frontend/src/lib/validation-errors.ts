// FastAPI 的 422 驗證錯誤，detail 是一個陣列而不是字串：
//
//   [{ "type": "url_parsing", "loc": ["body", "url"], "msg": "Input should be a valid URL, ..." }]
//
// 直接把它丟給 Error 的 message，會經過字串轉換而在畫面上變成 [object Object]。這裡負責把它
// 攤平成一句人看得懂的話。
//
// 對照的是 type 而不是 msg：msg 是 pydantic 產生的英文句子，且措辭會隨版本變動，而 type 是穩定的
// key。做法與 lib/audit-actions.ts、lib/highlight-icons.ts 相同。
export interface ValidationErrorItem {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
}

const MESSAGE_BY_TYPE: Record<string, string> = {
  missing: "必填",
  url_parsing: "不是有效的網址",
  url_scheme: "網址必須以 http:// 或 https:// 開頭",
  string_type: "必須是文字",
  string_too_short: "長度不足",
  string_too_long: "長度超過上限",
  int_parsing: "必須是整數",
  int_type: "必須是整數",
  float_parsing: "必須是數字",
  bool_parsing: "必須是是／否",
  literal_error: "不是允許的選項",
  enum: "不是允許的選項",
  greater_than: "超出允許範圍",
  greater_than_equal: "超出允許範圍",
  less_than: "超出允許範圍",
  less_than_equal: "超出允許範圍",
  value_error: "格式不正確",
  date_parsing: "不是有效的日期",
  datetime_parsing: "不是有效的日期時間",
};

// loc 的第一段是框架層級的來源（body／query／path），對使用者沒有意義。真正的欄位名是最後一段，
// 而純數字的最後一段代表陣列索引，那種情況往前再取一段才是欄位名。
function fieldName(loc: ValidationErrorItem["loc"]): string | null {
  if (!loc || loc.length === 0) {
    return null;
  }
  const segments = loc.filter((part) => part !== "body" && part !== "query" && part !== "path");
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const segment = segments[i];
    if (typeof segment === "string") {
      return segment;
    }
  }
  return null;
}

function describe(item: ValidationErrorItem): string {
  // 未知的 type 退回 pydantic 原本的英文 msg。這個 fallback 不能省：pydantic 升版隨時會有新的
  // type，顯示一句英文也遠好過顯示空白。
  const reason = (item.type && MESSAGE_BY_TYPE[item.type]) || item.msg || "格式不正確";
  const field = fieldName(item.loc);
  return field ? `${field}：${reason}` : reason;
}

/** 把 FastAPI 的驗證錯誤陣列攤平成一句可讀的訊息。 */
export function formatValidationErrors(items: ValidationErrorItem[]): string {
  const messages = items.map(describe).filter(Boolean);
  return messages.length > 0 ? messages.join("、") : "送出的內容格式不正確";
}
