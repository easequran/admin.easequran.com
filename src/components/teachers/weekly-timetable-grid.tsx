import type { TimetableDay } from "@/lib/scheduling";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Grid window: 6:00 to 23:00 covers virtually all real class times while
// keeping each day's column a reasonable height.
const GRID_START_MIN = 6 * 60;
const GRID_END_MIN = 23 * 60;
const GRID_SPAN = GRID_END_MIN - GRID_START_MIN;

function pct(minutes: number) {
  const clamped = Math.min(Math.max(minutes, GRID_START_MIN), GRID_END_MIN);
  return ((clamped - GRID_START_MIN) / GRID_SPAN) * 100;
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, "0")}${period}`;
}

export function WeeklyTimetableGrid({ days, timezone }: { days: TimetableDay[]; timezone: string }) {
  const hourMarks = Array.from({ length: (GRID_END_MIN - GRID_START_MIN) / 60 / 3 + 1 }, (_, i) => GRID_START_MIN + i * 180);
  const hasAnyFree = days.some((d) => d.free.length > 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-accent-100 border border-accent-300" /> Free
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-primary-600" /> Booked
        </span>
        <span className="ml-auto">Times shown in {timezone}</span>
      </div>

      {!hasAnyFree ? (
        <p className="text-sm text-slate-500">No availability set yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-7 gap-2">
            {days.map((day) => (
              <div key={day.dayOfWeek} className="flex flex-col">
                <p className="mb-1 text-center text-xs font-semibold text-primary-900">
                  {DAY_NAMES[day.dayOfWeek].slice(0, 3)}
                </p>
                <div className="relative h-64 rounded-lg bg-slate-50 border border-slate-100">
                  {hourMarks.map((m) => (
                    <div
                      key={m}
                      className="absolute left-0 right-0 border-t border-dashed border-slate-200"
                      style={{ top: `${pct(m)}%` }}
                    />
                  ))}
                  {day.free.map((block, i) => (
                    <div
                      key={`free-${i}`}
                      className="absolute left-0.5 right-0.5 rounded-md bg-accent-100 border border-accent-300"
                      style={{
                        top: `${pct(block.startMinutes)}%`,
                        height: `${pct(block.endMinutes) - pct(block.startMinutes)}%`,
                      }}
                      title={`Free ${formatMinutes(block.startMinutes)}–${formatMinutes(block.endMinutes)}`}
                    />
                  ))}
                  {day.busy.map((block, i) => (
                    <div
                      key={`busy-${i}`}
                      className="absolute left-0.5 right-0.5 overflow-hidden rounded-md bg-primary-600 px-1 py-0.5 text-[10px] font-medium leading-tight text-white shadow-sm"
                      style={{
                        top: `${pct(block.startMinutes)}%`,
                        height: `${Math.max(pct(block.endMinutes) - pct(block.startMinutes), 3)}%`,
                      }}
                      title={`${block.label ?? "Booked"} ${formatMinutes(block.startMinutes)}–${formatMinutes(block.endMinutes)}`}
                    >
                      {block.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            {hourMarks.map((m) => (
              <span key={m}>{formatMinutes(m)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
