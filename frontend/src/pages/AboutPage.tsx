import { Check } from "lucide-react";
import PageHeader from "../components/PageHeader";
import SectionTitle from "../components/SectionTitle";
import { Card, CardContent, CardHeader } from "../components/ui/card";

const IMPLEMENTED_FEATURES = [
  "本機帳號登入／JWT 驗證，亦支援串接 LDAP 進行驗證",
  "檔案上傳、下載，並可設定公開／私密可見度",
  "檔案版本歷史（同名檔案上傳不覆蓋，保留舊版本）",
  "依資料夾與連結卡片分類瀏覽",
  "使用者自助密碼重設，登入後亦可自行修改姓名與密碼",
  "上傳通知（新檔案上傳後，站內通知其他使用者，並視情況寄送 Email）",
  "管理員使用者管理與站台設定",
  "高權限操作稽核紀錄（Audit Log）",
];

function AboutPage() {
  return (
    <div className="page">
      <PageHeader title="關於本專案" />

      <Card>
        <CardContent className="flex flex-col gap-3 text-left">
          <p className="text-sm leading-relaxed text-muted-foreground">
            py-file-platform 是一個檔案管理／分享平台，定位類似社團或內部團隊的公開文件牆：訪客無需登入即可瀏覽並下載公開檔案，登入後才能上傳與管理自己的檔案。
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            本專案的主要目的是測試 Python（FastAPI）後端在前後端互動中，處理資料增刪查改（CRUD）與 API 的支援能力。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle>已實作功能</SectionTitle>
        </CardHeader>
        <CardContent>
          {/* Tailwind 的 preflight 會把 list marker 與內距清掉，所以這份清單以前會渲染成
              一排貼齊的灰色文字。功能列表用圖示也比項目符號更合適。 */}
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {IMPLEMENTED_FEATURES.map((feature) => (
              <li key={feature} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle>技術棧</SectionTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            FastAPI（後端）＋ React / Vite（前端）＋ PostgreSQL，以 docker-compose 部署。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AboutPage;
