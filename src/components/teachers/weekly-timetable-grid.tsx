import type { TimetableDay } from "@/lib/scheduling";
import {
  GRID_START_MIN,
  GRID_END_MIN,
  pct,
  formatMinutes,
  DAY_NAMES,
  currentDayOfWeek,
  currentMinutesOfDay,
} from "@/lib/utils/timetable-grid";

export function WeeklyTimetableGrid({ days, timezone }: { days: TimetableDay[]; timezone: string }) {
  const hourMarks = Array.from({ length: (GRID_END_MIN - GRID_START_MIN) / 60 / 3 + 1 }, (_, i) => GRID_START_MIN + i * 180);
  const hasAnyContent = days.some((d) => d.free.length > 0 || d.busy.length > 0);
  const todayDow = currentDayOfWeek(timezone);
  const nowMin = currentMinutesOfDay(timezone);
  const showNowLine = nowMin >= GRID_START_MIN && nowMin <= GRID_END_MIN;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-accent-100 border border-accent-300" /> Free
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-primary-600" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" /> Now
        </span>
        <span className="ml-auto">Times shown in {timezone}</span>
      </div>

      {!hasAnyContent ? (
        <p className="text-sm text-slate-500">No availability set yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-7 gap-2">
            {days.map((day) => {
              const isToday = day.dayOfWeek === todayDow;
              return (
                <div key={day.dayOfWeek} className="flex flex-col">
                  <p
                    className={`mb-1 rounded-md py-0.5 text-center text-xs font-semibold ${
                      isToday ? "bg-accent-100 text-primary-900" : "text-primary-900"
                    }`}
                  >
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
                        className="absolute left-0.5 right-0.5 flex items-center overflow-hidden rounded-md bg-primary-600 px-1.5 text-[11px] font-medium leading-tight text-white shadow-sm"
                        style={{
                          top: `${pct(block.startMinutes)}%`,
                          height: `${Math.max(pct(block.endMinutes) - pct(block.startMinutes), 3)}%`,
                          minHeight: "18px",
                        }}
                        title={`${block.label ?? "Booked"} ${formatMinutes(block.startMinutes)}–${formatMinutes(block.endMinutes)}`}
                      >
                        <span className="truncate">{block.label}</span>
                      </div>
                    ))}
                    {isToday && showNowLine && (
                      <div
                        className="absolute left-0 right-0 z-10 flex items-center gap-1"
                        style={{ top: `${pct(nowMin)}%` }}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                        <span className="h-px flex-1 bg-accent-500" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
