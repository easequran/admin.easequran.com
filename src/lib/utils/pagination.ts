/** Shared server-side pagination helpers. Pages read `?page=` (1-based). */

export const DEFAULT_PAGE_SIZE = 25;

export function parsePageParam(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/** Inclusive [from, to] for Supabase `.range()`. */
export function pageRange(page: number, pageSize: number = DEFAULT_PAGE_SIZE): { from: number; to: number } {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export function pageCount(total: number, pageSize: number = DEFAULT_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
