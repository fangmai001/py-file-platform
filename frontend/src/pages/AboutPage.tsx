import { Card, CardContent } from "../components/ui/card";

function AboutPage() {
  return (
    <div className="page">
      <Card>
        <CardContent className="flex flex-col gap-6 text-left">
          <div className="flex flex-col gap-2">
            <h2>關於本專案</h2>
            <p className="text-sm text-muted-foreground">
              py-file-platform 是一個檔案管理／分享平台，定位類似社團或內部團隊的公開文件牆：訪客無需登入即可瀏覽並下載公開檔案，登入後才能上傳與管理自己的檔案。
            </p>
            <p className="text-sm text-muted-foreground">
              本專案的主要目的是測試 Python（FastAPI）後端在前後端互動中，處理資料增刪查改（CRUD）與 API 的支援能力。
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h2>已實作功能</h2>
            <ul className="text-sm text-muted-foreground">
              <li>本機帳號登入 / JWT 驗證，亦支援串接 LDAP 進行驗證</li>
              <li>檔案上傳、下載，並可設定公開／私密可見度</li>
              <li>檔案版本歷史（同名檔案上傳不覆蓋，保留舊版本）</li>
              <li>資料夾卡片與連結卡片分類瀏覽</li>
              <li>使用者自助密碼重設</li>
              <li>上傳通知（新檔案上傳後，站內通知其他使用者，並視情況寄送 Email）</li>
              <li>管理員使用者管理與站台設定</li>
              <li>高權限操作稽核紀錄（Audit Log）</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <h2>技術棧</h2>
            <p className="text-sm text-muted-foreground">
              FastAPI（後端）＋ React / Vite（前端）＋ PostgreSQL，以 docker-compose 部署。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AboutPage;
