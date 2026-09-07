/**
 * Helpers for building PostgREST `.or()` ilike filters from user input.
 *
 * PostgREST's `.or()` mini-language treats `,` as a condition separator and
 * `()` as grouping, so a raw value containing either (e.g. "Khan, Ali" or
 * "Ahmed (Jr)") would split into malformed extra conditions. Wrapping the
 * value in double quotes (escaping `\` and `"` first) makes PostgREST treat
 * it as one literal string. This mirrors `escapeOrValue` in
 * `lib/actions/global-search.ts`, the pattern already in production here.
 */
export function escapeOrValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * `buildIlikeOr("ali", ["full_name", "email"])`
 *   -> `full_name.ilike."%ali%",email.ilike."%ali%"`
 * Returns `null` when the trimmed term is empty (nothing to filter on).
 */
export function buildIlikeOr(term: string | undefined | null, columns: string[]): string | null {
  const t = (term ?? "").trim();
  if (!t) return null;
  const like = escapeOrValue(`%${t}%`);
  return columns.map((c) => `${c}.ilike.${like}`).join(",");
}
