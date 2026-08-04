import type { ReactNode } from "react";
import { cn } from "../lib/utils";

/**
 * 頁面頂端的標題區塊。會產生真正的 <h1>——有好幾個測試是用 getByRole("heading")
 * 來定位頁面，而 shadcn 的 CardTitle（一個 <div>）會讓它們失效。
 */
function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="font-heading text-title text-foreground">{title}</h1>
        {description && <p className="max-w-[68ch] text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export default PageHeader;
