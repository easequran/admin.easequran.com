// Shared positioning math for the teacher timetable grid (day/week/month
// views all render the same free/busy blocks against this same timeline).

import { DateTime } from "luxon";

export const GRID_START_MIN = 6 * 60;
export const GRID_END_MIN = 23 * 60;
export const GRID_SPAN = GRID_END_MIN - GRID_START_MIN;

export function pct(minutes: number) {
  const clamped = Math.min(Math.max(minutes, GRID_START_MIN), GRID_END_MIN);
  return ((clamped - GRID_START_MIN) / GRID_SPAN) * 100;
}

export function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
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
