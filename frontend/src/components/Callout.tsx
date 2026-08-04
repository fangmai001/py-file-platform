import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const calloutVariants = cva(
  "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        destructive: "border-destructive/25 bg-destructive/10 text-destructive",
        success: "border-success/25 bg-success/10 text-success",
        info: "border-border bg-muted/50 text-foreground",
      },
    },
    defaultVariants: {
      variant: "destructive",
    },
  },
);

const CALLOUT_ICON = {
  destructive: CircleAlert,
  success: CircleCheck,
  info: Info,
} as const;

/**
 * 行內狀態訊息。用來取代過去在每一張表單與管理分頁裡重複出現的
 * 裸 <p className="text-sm text-destructive">。
 */
function Callout({
  variant = "destructive",
  className,
  children,
}: {
  variant?: NonNullable<VariantProps<typeof calloutVariants>["variant"]>;
  className?: string;
  children?: ReactNode;
}) {
  if (!children) {
    return null;
  }
  const Icon = CALLOUT_ICON[variant];
  return (
    <div
      role={variant === "destructive" ? "alert" : "status"}
      className={cn(calloutVariants({ variant }), className)}
    >
      <Icon />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

export default Callout;
