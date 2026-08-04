import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import { buttonVariants } from "../components/ui/button";

/**
 * Catch-all 路由。少了它，未知的網址會渲染出頁首、頁尾夾著一個空的 <main>，
 * 看起來像是頁面壞掉，而不是頁面不存在。
 */
function NotFoundPage() {
  return (
    <div className="page">
      <PageHeader title="找不到頁面" description="這個網址可能已經變更或輸入有誤。" />

      <EmptyState
        icon={Compass}
        title="頁面不存在"
        description="請確認網址是否正確，或回到首頁瀏覽公開檔案。"
        action={
          <Link to="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
            回到首頁
          </Link>
        }
      />
    </div>
  );
}

export default NotFoundPage;
