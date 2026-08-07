"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TimetableDay } from "@/lib/scheduling";
import { WeeklyTimetableGrid } from "@/components/teachers/weekly-timetable-grid";
import { TimetableSheetTable, TimetableLegend, buildDayColumn } from "@/components/teachers/timetable-sheet";
import { DAY_NAMES, currentDayOfWeek } from "@/lib/utils/timetable-grid";

type View = "day" | "week" | "month";

function DayView({ day, nextDay, timezone }: { day: TimetableDay; nextDay: TimetableDay; timezone: string }) {
  const hasContent = day.free.length > 0 || day.busy.length > 0;
  const columns = [
    { key: day.dayOfWeek, label: DAY_NAMES[day.dayOfWeek], highlighted: true, cells: buildDayColumn(day, nextDay) },
  ];

  return (
    <div>
      <TimetableLegend timezone={timezone} />
      {!hasContent ? (
        <p className="text-sm text-slate-500">No availability set for this day.</p>
      ) : (
        <TimetableSheetTable columns={columns} />
      )}
    </div>
  );
}

function MonthView({
  days,
  anchor,
  onSelectDay,
}: {
  days: TimetableDay[];
  anchor: DateTime;
  onSelectDay: (dayOfWeek: number) => void;
}) {
  const monthStart = anchor.startOf("month");
  const monthEnd = anchor.endOf("month");
  // Build a Sun-start grid regardless of Luxon's Mon-start week.
  const firstOfMonthWeekday = monthStart.weekday === 7 ? 0 : monthStart.weekday; // 0=Sun
  const gridFirstDay = monthStart.minus({ days: firstOfMonthWeekday });
  const totalCells = Math.ceil((firstOfMonthWeekday + monthEnd.day) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => gridFirstDay.plus({ days: i }));
  const today = DateTime.now();

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="grid grid-cols-7 gap-px bg-slate-200 text-center text-[11px] font-semibold text-white">
        {DAY_NAMES.map((d) => (
          <span key={d} className="bg-primary-900 py-2">
            {d.slice(0, 3)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-200">
        {cells.map((date) => {
          const inMonth = date.month === anchor.month;
          const dayOfWeek = date.weekday === 7 ? 0 : date.weekday;
          const dayData = days[dayOfWeek];
          const bookedCount = dayData?.busy.length ?? 0;
          const isToday = date.hasSame(today, "day");
          return (
            <button
              key={date.toISODate()}
              type="button"
              onClick={() => onSelectDay(dayOfWeek)}
              className={`flex h-16 flex-col items-start p-1.5 text-left text-xs transition-colors ${
                inMonth ? "bg-white hover:bg-accent-200/40" : "bg-slate-50 text-slate-300"
              } ${isToday ? "ring-2 ring-inset ring-accent-400" : ""}`}
            >
              <span className={inMonth ? "font-medium text-primary-900" : ""}>{date.day}</span>
              {inMonth && bookedCount > 0 && (
                <span className="mt-auto rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary-800">
                  {bookedCount} booked
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="border-t border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-500">
        Click a date to see that weekday&apos;s schedule. Shows the recurring weekly pattern — one-off cancellations on a
        specific date aren&apos;t reflected here.
      </p>
    </div>
  );
}

export function TimetableViewSwitcher({ days, timezone }: { days: TimetableDay[]; timezone: string }) {
  const [view, setView] = useState<View>("week");
  const todayDow = currentDayOfWeek(timezone);
  const [selectedDay, setSelectedDay] = useState(todayDow);
  const [monthAnchor, setMonthAnchor] = useState(() => DateTime.now().setZone(timezone));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-primary-100 p-0.5">
          {(["day", "week", "month"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                view === v ? "bg-accent-500 text-primary-900" : "text-primary-700 hover:bg-primary-50"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {view === "day" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDay((d) => (d + 6) % 7)}
              className="rounded-md border border-primary-100 p-1.5 text-primary-700 hover:bg-primary-50"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[90px] text-center text-sm font-medium text-primary-900">{DAY_NAMES[selectedDay]}</span>
            <button
              type="button"
              onClick={() => setSelectedDay((d) => (d + 1) % 7)}
              className="rounded-md border border-primary-100 p-1.5 text-primary-700 hover:bg-primary-50"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {view === "month" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonthAnchor((a) => a.minus({ months: 1 }))}
              className="rounded-md border border-primary-100 p-1.5 text-primary-700 hover:bg-primary-50"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[110px] text-center text-sm font-medium text-primary-900">{monthAnchor.toFormat("MMMM yyyy")}</span>
            <button
              type="button"
              onClick={() => setMonthAnchor((a) => a.plus({ months: 1 }))}
              className="rounded-md border border-primary-100 p-1.5 text-primary-700 hover:bg-primary-50"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {view === "week" && <WeeklyTimetableGrid days={days} timezone={timezone} />}
      {view === "day" && (
        <DayView day={days[selectedDay]} nextDay={days[(selectedDay + 1) % 7]} timezone={timezone} />
      )}
      {view === "month" && (
        <MonthView
          days={days}
          anchor={monthAnchor}
          onSelectDay={(dow) => {
            setSelectedDay(dow);
            setView("day");
          }}
        />
      )}
    </div>
  );
}
