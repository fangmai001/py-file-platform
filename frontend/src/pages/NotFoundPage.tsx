import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import { buttonVariants } from "../components/ui/button";

/**
 * Catch-all route. Without it an unknown URL rendered the header and footer around an
 * empty <main>, which reads as a broken page rather than a missing one.
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
