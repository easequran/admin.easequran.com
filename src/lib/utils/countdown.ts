import type { DateTime } from "luxon";

/** "1:15:26" / "22:35" -- a clock-style countdown, seconds always visible. */
export function formatCountdown(target: DateTime, now: DateTime): string {
  const totalSeconds = Math.max(0, Math.floor(target.diff(now, "seconds").seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  if (hours > 0) return `${hours}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}
