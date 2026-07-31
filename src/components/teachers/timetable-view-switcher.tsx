"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TimetableDay } from "@/lib/scheduling";
import { WeeklyTimetableGrid } from "@/components/teachers/weekly-timetable-grid";
import {
  GRID_START_MIN,
  GRID_END_MIN,
  pct,
  formatMinutes,
  DAY_NAMES,
  currentDayOfWeek,
  currentMinutesOfDay,
} from "@/lib/utils/timetable-grid";

type View = "day" | "week" | "month";

function DayView({ day, timezone, isToday }: { day: TimetableDay; timezone: string; isToday: boolean }) {
  const hourMarks = Array.from({ length: (GRID_END_MIN - GRID_START_MIN) / 60 + 1 }, (_, i) => GRID_START_MIN + i * 60);
  const nowMin = currentMinutesOfDay(timezone);
  const showNowLine = isToday && nowMin >= GRID_START_MIN && nowMin <= GRID_END_MIN;

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
      <div className="flex gap-3">
        <div className="w-14 shrink-0 text-right text-[10px] text-slate-400">
          <div className="relative h-96">
            {hourMarks.map((m) => (
              <span key={m} className="absolute right-0 -translate-y-1/2" style={{ top: `${pct(m)}%` }}>
                {formatMinutes(m)}
              </span>
            ))}
          </div>
        </div>
        <div className="relative h-96 flex-1 rounded-lg border border-slate-100 bg-slate-50">
          {hourMarks.map((m) => (
            <div key={m} className="absolute left-0 right-0 border-t border-dashed border-slate-200" style={{ top: `${pct(m)}%` }} />
          ))}
          {day.free.length === 0 && day.busy.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">No availability set for this day.</p>
          )}
          {day.free.map((block, i) => (
            <div
              key={`free-${i}`}
              className="absolute left-1 right-1 rounded-md bg-accent-100 border border-accent-300"
              style={{ top: `${pct(block.startMinutes)}%`, height: `${pct(block.endMinutes) - pct(block.startMinutes)}%` }}
              title={`Free ${formatMinutes(block.startMinutes)}–${formatMinutes(block.endMinutes)}`}
            />
          ))}
          {day.busy.map((block, i) => (
            <div
              key={`busy-${i}`}
              className="absolute left-1 right-1 overflow-hidden rounded-md bg-primary-600 px-2 py-1 text-xs font-medium text-white shadow-sm"
              style={{ top: `${pct(block.startMinutes)}%`, height: `${Math.max(pct(block.endMinutes) - pct(block.startMinutes), 3)}%` }}
              title={`${block.label ?? "Booked"} ${formatMinutes(block.startMinutes)}–${formatMinutes(block.endMinutes)}`}
            >
              {block.label} · {formatMinutes(block.startMinutes)}–{formatMinutes(block.endMinutes)}
            </div>
          ))}
          {showNowLine && (
            <div className="absolute left-0 right-0 z-10 flex items-center gap-1" style={{ top: `${pct(nowMin)}%` }}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
              <span className="h-px flex-1 bg-accent-500" />
            </div>
          )}
        </div>
      </div>
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
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-primary-900">
        {DAY_NAMES.map((d) => (
          <span key={d}>{d.slice(0, 3)}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date) => {
          const inMonth = date.month === anchor.month;
          const dayOfWeek = date.weekday === 7 ? 0 : date.weekday;
          const dayData = days[dayOfWeek];
          const isToday = date.hasSame(today, "day");
          return (
            <button
              key={date.toISODate()}
              type="button"
              onClick={() => onSelectDay(dayOfWeek)}
              className={`flex h-16 flex-col items-start rounded-lg border p-1.5 text-left text-xs transition-colors ${
                inMonth ? "border-slate-100 bg-white hover:border-primary-200" : "border-transparent bg-slate-50 text-slate-300"
              } ${isToday ? "ring-2 ring-accent-400" : ""}`}
            >
              <span className={inMonth ? "font-medium text-primary-900" : ""}>{date.day}</span>
              {inMonth && (
                <div className="mt-auto flex gap-1">
                  {dayData?.free.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-accent-400" title="Has availability" />}
                  {dayData?.busy.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary-600" title="Has booked classes" />}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
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
      {view === "day" && <DayView day={days[selectedDay]} timezone={timezone} isToday={selectedDay === todayDow} />}
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
