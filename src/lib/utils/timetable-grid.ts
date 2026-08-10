// Shared positioning math for the teacher timetable grid (day/week/month
// views all render the same free/busy blocks against this same timeline).

import { DateTime } from "luxon";

// The grid covers a full 24 hours, anchored to start at 6 AM rather than
// midnight -- expressed as 6:00 (360) through 30:00 (1800) on an extended
// minutes-since-midnight scale. Anchoring away from midnight means a class
// that spans midnight (e.g. starts at 11 PM) still renders as one
// continuous block in a single day's column, since buildWeeklyTimetable in
// lib/scheduling.ts lets such a block's endMinutes extend past 1440 rather
// than splitting it across two days.
export const GRID_START_MIN = 6 * 60;
export const GRID_END_MIN = 30 * 60;
export const GRID_SPAN = GRID_END_MIN - GRID_START_MIN;

export function pct(minutes: number) {
  const clamped = Math.min(Math.max(minutes, GRID_START_MIN), GRID_END_MIN);
  return ((clamped - GRID_START_MIN) / GRID_SPAN) * 100;
}

export function formatMinutes(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function currentDayOfWeek(timezone: string) {
  const weekday = DateTime.now().setZone(timezone).weekday;
  return weekday === 7 ? 0 : weekday;
}

export function currentMinutesOfDay(timezone: string) {
  const now = DateTime.now().setZone(timezone);
  return now.hour * 60 + now.minute;
}
