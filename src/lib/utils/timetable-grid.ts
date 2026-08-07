// Shared positioning math for the teacher timetable grid (day/week/month
// views all render the same free/busy blocks against this same timeline).

import { DateTime } from "luxon";

// Teaching hours run overnight (evening into early morning), so the grid
// starts at 9 PM and runs past midnight to 6 AM the next day -- expressed
// as 21:00 (1260) through 30:00 (1800) on an extended minutes-since-midnight
// scale, since blocks that cross midnight are already resolved onto this
// same extended scale by buildWeeklyTimetable in lib/scheduling.ts.
export const GRID_START_MIN = 21 * 60;
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
