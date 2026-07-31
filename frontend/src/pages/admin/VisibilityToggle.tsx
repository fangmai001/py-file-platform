import { badgeVariants } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

/**
 * Public/private switch for a draft row. Wears the same success/neutral colours as the
 * read-only `Badge` in the users and files tables, so one visibility vocabulary reads
 * across every admin table — but stays a real button, since this one is editable.
 *
 * `hover:` classes sit in a different tailwind-merge group than the badge's base colours,
 * so the ghost variant's grey hover has to be overridden explicitly — in both themes, since
 * `dark:hover:` is its own group again and outranks a bare `hover:`. Without those overrides,
 * hovering "公開" looks like it already flipped to private.
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
