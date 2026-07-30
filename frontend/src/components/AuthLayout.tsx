import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";

/**
 * Shared shell for the login / forgot-password / reset-password screens, which each
 * hand-rolled the same centred card. The <h1> is styled explicitly here so it doesn't
 * pick up stray element-level margins.
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
