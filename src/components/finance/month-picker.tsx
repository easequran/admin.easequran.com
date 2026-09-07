"use client";

import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FOCUS_RING } from "@/lib/utils/focus";

/** Prev / label / next month stepper -- avoids `<input type="month">`, which
 * has no native picker in some browsers. `month` is `yyyy-LL`. */
export function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  const current = DateTime.fromFormat(month, "yyyy-LL");
  const base = current.isValid ? current : DateTime.now().startOf("month");

  const go = (target: DateTime) => router.push(`/finance?month=${target.toFormat("yyyy-LL")}`);

  const btn = `flex h-9 w-9 items-center justify-center rounded-lg border border-primary-200 text-primary-700 transition-colors hover:bg-primary-50 ${FOCUS_RING}`;

  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" aria-label="Previous month" className={btn} onClick={() => go(base.minus({ months: 1 }))}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[7.5rem] text-center text-sm font-medium text-primary-900">
        {base.toFormat("LLLL yyyy")}
      </span>
      <button type="button" aria-label="Next month" className={btn} onClick={() => go(base.plus({ months: 1 }))}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
