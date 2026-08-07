import type { TimetableDay } from "@/lib/scheduling";
import { DAY_NAMES, currentDayOfWeek } from "@/lib/utils/timetable-grid";
import { TimetableSheetTable, TimetableLegend, buildDayColumn } from "@/components/teachers/timetable-sheet";

// Monday-first order, matching a typical weekly-schedule sheet (Sunday last).
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function WeeklyTimetableGrid({ days, timezone }: { days: TimetableDay[]; timezone: string }) {
  const hasAnyContent = days.some((d) => d.free.length > 0 || d.busy.length > 0);
  const todayDow = currentDayOfWeek(timezone);

  const columns = DAY_ORDER.map((dow) => ({
    key: dow,
    label: DAY_NAMES[dow],
    highlighted: dow === todayDow,
    cells: buildDayColumn(days.find((d) => d.dayOfWeek === dow)),
  }));

  return (
    <div>
      <TimetableLegend timezone={timezone} />
      {!hasAnyContent ? (
        <p className="text-sm text-slate-500">No availability set yet.</p>
      ) : (
        <TimetableSheetTable columns={columns} />
      )}
    </div>
  );
}
