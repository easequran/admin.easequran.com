import { DateTime } from "luxon";

/**
 * Given a recurring schedule's weekday + local time + anchor timezone,
 * compute the UTC instant for the occurrence in a specific week.
 * Handles DST because the local wall-clock time is re-resolved against
 * the IANA zone for that particular date, rather than storing a fixed
 * UTC offset.
 */
export function nextOccurrenceUtc(params: {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  localStartTime: string; // "HH:mm" or "HH:mm:ss"
  timezone: string;
  durationMinutes: number;
  fromDate?: DateTime;
}): { startAt: DateTime; endAt: DateTime } {
  const { dayOfWeek, localStartTime, timezone, durationMinutes } = params;
  const [hour, minute] = localStartTime.split(":").map(Number);
  const from = (params.fromDate ?? DateTime.now().setZone(timezone)).setZone(timezone);

  // Luxon weekday: 1 = Monday .. 7 = Sunday. Convert from 0=Sunday..6=Saturday.
  const luxonWeekday = dayOfWeek === 0 ? 7 : dayOfWeek;

  let candidate = from.set({
    hour,
    minute,
    second: 0,
    millisecond: 0,
  });

  const diff = luxonWeekday - candidate.weekday;
  candidate = candidate.plus({ days: diff });
  if (candidate < from) {
    candidate = candidate.plus({ weeks: 1 });
  }

  const startAt = candidate;
  const endAt = startAt.plus({ minutes: durationMinutes });
  return { startAt, endAt };
}

/** Format a UTC ISO instant in a given viewer's timezone. */
export function formatInZone(
  isoUtc: string,
  timezone: string,
  format: string = "EEE, MMM d · h:mm a",
) {
  return DateTime.fromISO(isoUtc, { zone: "utc" }).setZone(timezone).toFormat(format);
}

/** Convert a local HH:mm in one timezone to the equivalent HH:mm in another, for a reference date. */
export function convertLocalTime(
  localTime: string,
  fromZone: string,
  toZone: string,
  referenceDate: DateTime = DateTime.now(),
) {
  const [hour, minute] = localTime.split(":").map(Number);
  const dt = referenceDate.setZone(fromZone).set({ hour, minute, second: 0, millisecond: 0 });
  return dt.setZone(toZone);
}

export const COMMON_TIMEZONES = [
  "UTC",
  "Asia/Karachi",
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Istanbul",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Australia/Sydney",
];

export function listAllTimezones(): string[] {
  // Intl.supportedValuesOf is available in modern Node/browsers.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Intl as any).supportedValuesOf("timeZone");
  } catch {
    return COMMON_TIMEZONES;
  }
}
