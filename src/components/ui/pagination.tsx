import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { FOCUS_RING } from "@/lib/utils/focus";

/**
 * Server-side pager. Renders prev/next links that only change the `page`
 * search param, preserving every other param already on `baseParams`.
 * Hidden entirely when there's only one page.
 */
export function Pagination({
  page,
  totalPages,
  totalItems,
  basePath,
  baseParams,
  itemLabel = "items",
}: {
  page: number;
  totalPages: number;
  totalItems?: number;
  basePath: string;
  /** Current search params to carry across (page is overridden). */
  baseParams?: Record<string, string | undefined>;
  itemLabel?: string;
}) {
  if (totalPages <= 1) return null;

  function href(target: number) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(baseParams ?? {})) {
      if (v != null && v !== "" && k !== "page") sp.set(k, v);
    }
    if (target > 1) sp.set("page", String(target));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const linkClass =
    "inline-flex h-8 items-center gap-1 rounded-lg border border-primary-200 px-3 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50";

  return (
    <nav className="flex items-center justify-between gap-3 pt-1" aria-label="Pagination">
      <p className="text-xs text-slate-500">
        Page {page} of {totalPages}
        {typeof totalItems === "number" ? ` · ${totalItems} ${itemLabel}` : ""}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={cn(linkClass, FOCUS_RING)} rel="prev">
            <ChevronLeft className="h-4 w-4" /> Previous
          </Link>
        ) : (
          <span className={cn(linkClass, "cursor-not-allowed opacity-40")} aria-disabled="true">
            <ChevronLeft className="h-4 w-4" /> Previous
          </span>
        )}
        {page < totalPages ? (
          <Link href={href(page + 1)} className={cn(linkClass, FOCUS_RING)} rel="next">
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className={cn(linkClass, "cursor-not-allowed opacity-40")} aria-disabled="true">
            Next <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
