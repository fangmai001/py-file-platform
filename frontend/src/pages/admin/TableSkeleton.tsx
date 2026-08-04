import { Skeleton } from "../../components/ui/skeleton";

/** 分頁的表格仍在載入時顯示的佔位列。 */
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
