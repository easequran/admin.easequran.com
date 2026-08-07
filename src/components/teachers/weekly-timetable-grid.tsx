import type { TimetableDay } from "@/lib/scheduling";
import { GRID_START_MIN, GRID_END_MIN, formatMinutes, DAY_NAMES, currentDayOfWeek } from "@/lib/utils/timetable-grid";

const SLOT_MIN = 30;
// Monday-first order, matching a typical weekly-schedule sheet (Sunday last).
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

type Cell =
  | { kind: "empty" }
  | { kind: "busy"; label: string; span: number; isTrial: boolean }
  | { kind: "skip" };

function buildColumn(day: TimetableDay | undefined): Cell[] {
  const slots: Cell[] = [];
  for (let m = GRID_START_MIN; m < GRID_END_MIN; m += SLOT_MIN) {
    const busy = day?.busy.find((b) => b.startMinutes === m);
    if (busy) {
      const span = Math.max(1, Math.round((busy.endMinutes - busy.startMinutes) / SLOT_MIN));
      slots.push({ kind: "busy", label: busy.label ?? "Booked", span, isTrial: Boolean(busy.isTrial) });
      for (let i = 1; i < span; i++) slots.push({ kind: "skip" });
      continue;
    }
    const withinBusy = day?.busy.some((b) => m > b.startMinutes && m < b.endMinutes);
    if (withinBusy) continue; // already covered by a rowSpan above
    slots.push({ kind: "empty" });
  }
  return slots;
}

export function WeeklyTimetableGrid({ days, timezone }: { days: TimetableDay[]; timezone: string }) {
  const hasAnyContent = days.some((d) => d.free.length > 0 || d.busy.length > 0);
  const todayDow = currentDayOfWeek(timezone);
  const slotStarts = Array.from({ length: (GRID_END_MIN - GRID_START_MIN) / SLOT_MIN }, (_, i) => GRID_START_MIN + i * SLOT_MIN);
  const columns = DAY_ORDER.map((dow) => buildColumn(days.find((d) => d.dayOfWeek === dow)));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-primary-600" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-red-100 border border-red-400" /> Trial (unconfirmed)
        </span>
        <span className="ml-auto">Times shown in {timezone}</span>
      </div>

      {!hasAnyContent ? (
        <p className="text-sm text-slate-500">No availability set yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[720px] border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border border-slate-200 bg-primary-900 px-2 py-2 text-white">Timing</th>
                {DAY_ORDER.map((dow) => (
                  <th
                    key={dow}
                    className={`border border-slate-200 px-2 py-2 font-semibold text-primary-900 ${
                      dow === todayDow ? "bg-accent-300" : "bg-accent-200"
                    }`}
                  >
                    {DAY_NAMES[dow]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slotStarts.map((m, rowIndex) => (
                <tr key={m}>
                  <td className="sticky left-0 z-10 whitespace-nowrap border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-600">
                    {formatMinutes(m)}
                  </td>
                  {columns.map((col, colIndex) => {
                    const cell = col[rowIndex];
                    if (cell.kind === "skip") return null;
                    if (cell.kind === "busy") {
                      return (
                        <td
                          key={colIndex}
                          rowSpan={cell.span}
                          className={`border border-slate-200 px-2 py-1 text-center align-middle font-semibold ${
                            cell.isTrial ? "bg-red-50 text-red-700" : "bg-primary-50 text-primary-800"
                          }`}
                          title={`${cell.label}${cell.isTrial ? " (trial, unconfirmed)" : ""}`}
                        >
                          <span className="line-clamp-2">{cell.label}</span>
                        </td>
                      );
                    }
                    return <td key={colIndex} className="border border-slate-200 px-2 py-1" />;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
