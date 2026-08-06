// 設定新密碼時的最短長度。這是 backend/app/core/security.py 之 MIN_PASSWORD_LENGTH 的鏡像，
// 兩處必須一起改——與 useSiteSettingsAdmin.ts 的 MAX_UPLOAD_SIZE_MB_CEILING 是同一種做法。
//
// 真正把關的是後端；這裡只是讓使用者在送出之前就看到提示，而不是收到一句沒有數字的
// 「password：長度不足」。因此只掛在「設定新密碼」的欄位上，登入欄位不掛（既有帳號的密碼
// 可能比這個值短，後端在登入端也刻意沒有長度限制）。
export const MIN_PASSWORD_LENGTH = 8;
