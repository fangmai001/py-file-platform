import { badgeVariants } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

/**
 * 草稿列的公開／私密切換開關。採用與使用者、檔案表格中唯讀 `Badge` 相同的 success／中性色，
 * 讓每一張管理表格共用同一套可見性語彙——但它維持為真正的 button，因為這一個是可編輯的。
 *
 * `hover:` class 與 badge 的基礎顏色分屬不同的 tailwind-merge 群組，因此 ghost 變體的灰色
 * hover 必須明確覆寫掉——而且兩種主題都要，因為 `dark:hover:` 又自成一組，優先度高於單純的
 * `hover:`。少了這些覆寫，滑鼠移過「公開」時看起來會像是已經翻成私密了。
 */
function VisibilityToggle({ isPublic, onToggle }: { isPublic: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="ghost"
      size="xs"
      className={badgeVariants({
        variant: isPublic ? "success" : "secondary",
        className: isPublic
          ? "cursor-pointer px-2.5 hover:bg-success/20 hover:text-success dark:hover:bg-success/20"
          : "cursor-pointer px-2.5 hover:bg-muted/70 hover:text-muted-foreground dark:hover:bg-muted/70",
      })}
      title={isPublic ? "點擊改為私密" : "點擊改為公開"}
      onClick={onToggle}
    >
      {isPublic ? "公開" : "私密"}
    </Button>
  );
}

export default VisibilityToggle;
