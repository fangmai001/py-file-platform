import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const sectionTitleVariants = cva("font-heading text-foreground", {
  variants: {
    size: {
      default: "text-section",
      sm: "text-sub",
      lg: "text-lg leading-7 font-semibold",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

/**
 * 卡片與區塊標題。這裡有兩件事很重要：
 * - 它渲染的是真正的標題元素，因此 getByRole("heading") 仍然有效
 *   （shadcn 的 CardTitle 渲染出來的是 <div>）；
 * - 它帶著 data-slot="card-title"，因此當 CardAction 與它並排時，
 *   CardHeader 的 grid 邏輯仍能正確排版。
 */
function SectionTitle({
  as: Comp = "h2",
  size,
  className,
  ...props
}: ComponentProps<"h2"> & { as?: "h2" | "h3" | "h4" } & VariantProps<typeof sectionTitleVariants>) {
  return (
    <Comp
      data-slot="card-title"
      className={cn(sectionTitleVariants({ size }), className)}
      {...props}
    />
  );
}

export default SectionTitle;
