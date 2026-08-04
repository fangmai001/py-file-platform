import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";

/**
 * 登入／忘記密碼／重設密碼三個畫面共用的外殼，它們原本各自手刻了同一張置中卡片。
 * 這裡的 <h1> 明確指定樣式，免得沾到多餘的元素層級 margin。
 */
function AuthLayout({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Card className="w-full max-w-sm shadow-md">
        <CardHeader className="gap-2 text-center">
          <h1 className="font-heading text-xl leading-tight font-semibold text-foreground">
            {title}
          </h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

export default AuthLayout;
