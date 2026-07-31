import { Skeleton } from "../../components/ui/skeleton";

/** Placeholder rows shown while a tab's table is still loading. */
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export default TableSkeleton;
