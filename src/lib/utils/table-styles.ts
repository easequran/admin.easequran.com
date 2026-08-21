import { cn } from "@/lib/utils/cn";

/**
 * Shared "branded, not pastel" table look: a light navy header with a gold
 * brand-accent underline, tight row padding, and a zebra stripe for
 * readability instead of per-row borders. Used by every data table
 * (Teachers, Students, Leads, Schedule) so they read as one system.
 */
export const TABLE_HEAD_CLASS =
  "border-b-2 border-accent-500 bg-primary-50 text-left text-xs font-semibold uppercase tracking-wide text-primary-800";

export const TABLE_HEAD_CELL_CLASS = "px-4 py-2.5";
export const TABLE_CELL_CLASS = "px-4 py-2.5";

export function tableRowClass(index: number, extra?: string) {
  return cn(index % 2 === 1 ? "bg-slate-50/70" : "bg-white", "hover:bg-accent-50/50 transition-colors", extra);
}
