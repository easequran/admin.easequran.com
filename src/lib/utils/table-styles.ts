import { cn } from "@/lib/utils/cn";

/**
 * Shared "branded, not pastel" table look: a light navy header with a gold
 * brand-accent underline, grid lines between cells (via border-collapse on
 * the <table> + a border on every cell), a zebra stripe for readability,
 * and slightly larger/darker text than default body copy. Used by every
 * data table (Teachers, Students, Leads, Schedule, Fees, Invoices) so they
 * read as one system.
 */
export const TABLE_ELEMENT_CLASS = "w-full border-collapse text-[15px]";

export const TABLE_HEAD_CLASS =
  "border-b-2 border-accent-500 bg-primary-50 text-left text-xs font-semibold uppercase tracking-wide text-primary-800";

export const TABLE_HEAD_CELL_CLASS = "border border-primary-300 px-4 py-2.5";
export const TABLE_CELL_CLASS = "border border-primary-200 px-4 py-2.5";

/** Secondary/muted cell text (emails, timezones, etc.) -- darker than the
 * app's usual text-slate-500/600 for better readability inside a dense grid. */
export const TABLE_CELL_SECONDARY_CLASS = "text-slate-700";

export function tableRowClass(index: number, extra?: string) {
  return cn(index % 2 === 1 ? "bg-slate-50/70" : "bg-white", "hover:bg-accent-50/50 transition-colors", extra);
}
