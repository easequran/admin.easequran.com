"use client";

import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FOCUS_RING } from "@/lib/utils/focus";
import { cn } from "@/lib/utils/cn";

/** Prev / label / next month stepper plus an "All time" toggle -- avoids
 * `<input type="month">`, which has no native picker in some browsers.
 * `month` is `yyyy-LL`. When `allTime` is set the stepper is inert and the
 * "All time" pill is the active state. */
export function MonthPicker({ month, allTime = false }: { month: string; allTime?: boolean }) {
  const router = useRouter();
  const current = DateTime.fromFormat(month, "yyyy-LL");
  const base = current.isValid ? current : DateTime.now().startOf("month");

  const goMonth = (target: DateTime) => router.push(`/finance?month=${target.toFormat("yyyy-LL")}`);
  const goAllTime = () => router.push(`/finance?month=${base.toFormat("yyyy-LL")}&showAll=1`);

  const step = cn(
    "flex h-9 w-9 items-center justify-center rounded-lg border border-primary-200 text-primary-700 transition-colors",
    allTime ? "opacity-40" : `hover:bg-primary-50 ${FOCUS_RING}`,
  );

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-label="Previous month"
        className={step}
        disabled={allTime}
        onClick={() => goMonth(base.minus({ months: 1 }))}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span
        className={cn(
          "min-w-[7.5rem] text-center text-sm font-medium",
          allTime ? "text-slate-400" : "text-primary-900",
        )}
      >
        {base.toFormat("LLLL yyyy")}
      </span>
      <button
        type="button"
        aria-label="Next month"
        className={step}
        disabled={allTime}
        onClick={() => goMonth(base.plus({ months: 1 }))}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-pressed={allTime}
        onClick={allTime ? () => goMonth(base) : goAllTime}
        className={cn(
          "h-9 rounded-lg border px-3 text-sm font-medium transition-colors",
          FOCUS_RING,
          allTime
            ? "border-primary-600 bg-primary-600 text-white"
            : "border-primary-200 text-primary-700 hover:bg-primary-50",
        )}
      >
        All time
      </button>
    </div>
  );
}
