import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-primary-100/70", className)} />;
}

function HeaderSkeleton() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="h-11 w-11 rounded-xl" />
      <div className="space-y-2 pt-1">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
    </div>
  );
}

/** Generic fallback -- a header plus a few text lines. */
export function PageLoading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="space-y-2 rounded-xl border border-primary-100 bg-white p-5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

/** For list/table pages: header, a stat-card row, then a table shell. */
export function TableLoading({ rows = 8, stats = 3 }: { rows?: number; stats?: number }) {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      {stats > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: stats }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
          ))}
        </div>
      )}
      <div className="space-y-3 rounded-xl border border-primary-100 bg-white p-4">
        <Skeleton className="h-9 w-full max-w-xs" />
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** For dashboards: header + a grid of cards. */
export function CardsLoading({ cards = 6 }: { cards?: number }) {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** For create/edit pages: header + a stack of field rows. */
export function FormLoading({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="max-w-xl space-y-4 rounded-xl border border-primary-100 bg-white p-5">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}
