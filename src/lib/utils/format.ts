import { DateTime } from "luxon";

/**
 * One place for user-facing date/time formatting so the app doesn't drift
 * between `MMM d`, `d MMM yyyy`, raw ISO, etc. Inputs are ISO strings or
 * `yyyy-MM-dd` date strings; anything unparseable is passed straight back.
 */

function parse(value: string): DateTime | null {
  if (!value) return null;
  const dt = value.length <= 10 ? DateTime.fromISO(value) : DateTime.fromISO(value, { zone: "utc" });
  return dt.isValid ? dt : null;
}

/** e.g. "7 Sep 2026" */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return parse(value)?.toFormat("d LLL yyyy") ?? value;
}

/** e.g. "7 Sep 2026, 3:30 PM" in the given zone (defaults to local). */
export function formatDateTime(value: string | null | undefined, zone?: string): string {
  if (!value) return "—";
  const dt = parse(value);
  if (!dt) return value;
  return (zone ? dt.setZone(zone) : dt).toFormat("d LLL yyyy, h:mm a");
}

/** e.g. "1 Sep – 30 Sep 2026" (drops the repeated year/month where possible). */
export function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  const s = start ? parse(start) : null;
  const e = end ? parse(end) : null;
  if (!s || !e) return `${formatDate(start)} – ${formatDate(end)}`;
  if (s.hasSame(e, "year")) {
    if (s.hasSame(e, "month")) return `${s.toFormat("d")} – ${e.toFormat("d LLL yyyy")}`;
    return `${s.toFormat("d LLL")} – ${e.toFormat("d LLL yyyy")}`;
  }
  return `${s.toFormat("d LLL yyyy")} – ${e.toFormat("d LLL yyyy")}`;
}
