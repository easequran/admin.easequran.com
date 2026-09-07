/**
 * Strips characters that have meaning in the PostgREST filter grammar
 * (`,` `(` `)` `%` `_` `"` `'` `\` `*`) before a user's search term is
 * interpolated into a `.or("col.ilike.%term%")` string. Search is fuzzy
 * anyway, so dropping punctuation costs nothing and closes off both
 * filter-injection and accidental syntax breakage.
 */
export function sanitizeSearch(raw: string | undefined | null): string {
  return (raw ?? "").replace(/[,()%_"'\\*]/g, " ").replace(/\s+/g, " ").trim();
}
