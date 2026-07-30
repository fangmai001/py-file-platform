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
 * Card and section headings. Two things matter here:
 * - it renders a real heading element, so getByRole("heading") keeps working
 *   (shadcn's CardTitle renders a <div>);
 * - it carries data-slot="card-title", so CardHeader's grid logic still lays out
 *   correctly when a CardAction sits alongside it.
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
