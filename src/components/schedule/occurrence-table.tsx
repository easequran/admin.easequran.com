"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { formatInZone } from "@/lib/utils/timezone";
import { formatCountdown } from "@/lib/utils/countdown";
import { updateOccurrenceStatus } from "@/lib/actions/schedule";
import { TABLE_HEAD_CLASS, TABLE_HEAD_CELL_CLASS, TABLE_CELL_CLASS, tableRowClass } from "@/lib/utils/table-styles";
import { cn } from "@/lib/utils/cn";
import type { OccurrenceStatus } from "@/lib/types/database";

const statusTone: Record<OccurrenceStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  scheduled: "info",
  completed: "success",
  cancelled: "neutral",
  no_show: "danger",
  rescheduled: "warning",
};

/** Same data/behavior as OccurrenceList, laid out as a proper table (Student / Teacher / Date & time / Status) to match the Students/Teachers/Leads tables. */
export function OccurrenceTable({
  occurrences,
  viewerTimezone,
  editBasePath,
  showStatusActions = false,
}: {
  occurrences: {
    id: string;
    start_at: string;
    status: OccurrenceStatus;
    is_trial: boolean;
    studentName?: string;
    teacherName?: string;
    leadId?: string;
    leadConverted?: boolean;
  }[];
  viewerTimezone: string;
  editBasePath?: string;
  showStatusActions?: boolean;
}) {
  const [now, setNow] = useState(() => DateTime.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(DateTime.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  if (occurrences.length === 0) {
    return <p className="text-sm text-slate-500">No classes scheduled.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg">
      <table className="w-full min-w-[560px] text-sm">
        <thead className={TABLE_HEAD_CLASS}>
          <tr>
            <th className={TABLE_HEAD_CELL_CLASS}>Student</th>
            <th className={TABLE_HEAD_CELL_CLASS}>Teacher</th>
            <th className={TABLE_HEAD_CELL_CLASS}>Date &amp; time</th>
            <th className={TABLE_HEAD_CELL_CLASS}>Status</th>
          </tr>
        </thead>
        <tbody>
          {occurrences.map((o, i) => {
            const start = DateTime.fromISO(o.start_at);
            const isFutureScheduled = o.status === "scheduled" && start > now;
            // studentName is only ever omitted when this table is showing a
            // student their own schedule (their name would be redundant) --
            // fall back to "With {teacher}" in that one case.
            const label = o.studentName !== undefined ? o.studentName || "Trial" : `With ${o.teacherName ?? "—"}`;
            return (
              <tr key={o.id} className={tableRowClass(i)}>
                <td className={TABLE_CELL_CLASS}>
                  <div className="flex items-center gap-2 font-medium text-primary-900">
                    {editBasePath ? (
                      <Link href={`${editBasePath}/${o.id}`} prefetch={false} className="hover:underline">
                        {label}
                      </Link>
                    ) : (
                      label
                    )}
                    {o.is_trial && (
                      <Badge tone="accent" className="ml-0.5">
                        Trial
                      </Badge>
                    )}
                  </div>
                </td>
                <td className={cn(TABLE_CELL_CLASS, "text-slate-600")}>
                  {o.studentName !== undefined ? (o.teacherName ?? "—") : "—"}
                </td>
                <td className={cn(TABLE_CELL_CLASS, "text-slate-600")}>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {formatInZone(o.start_at, viewerTimezone)}
                  </div>
                  {isFutureScheduled && (
                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5">
                      <span className="text-[11px] font-medium text-slate-500">Starting in</span>
                      <span className="font-mono text-xs font-bold tabular-nums text-slate-900">
                        {formatCountdown(start, now)}
                      </span>
                    </div>
                  )}
                </td>
                <td className={TABLE_CELL_CLASS}>
                  {showStatusActions && o.status === "scheduled" ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <form action={updateOccurrenceStatus.bind(null, o.id, "completed")}>
                        <Button type="submit" size="sm" variant="outline">
                          Completed
                        </Button>
                      </form>
                      <form action={updateOccurrenceStatus.bind(null, o.id, "no_show")}>
                        <Button type="submit" size="sm" variant="outline">
                          Didn&apos;t show
                        </Button>
                      </form>
                      <form action={updateOccurrenceStatus.bind(null, o.id, "cancelled")}>
                        <Button type="submit" size="sm" variant="danger">
                          Cancel
                        </Button>
                      </form>
                    </div>
                  ) : o.status === "completed" && o.leadId && !o.leadConverted ? (
                    <div className="flex items-center gap-2">
                      <Badge tone={statusTone[o.status]}>{o.status.replace("_", " ")}</Badge>
                      <LinkButton href={`/leads/${o.leadId}/convert`} size="sm">
                        Convert to student
                      </LinkButton>
                    </div>
                  ) : (
                    <Badge tone={statusTone[o.status]}>{o.status.replace("_", " ")}</Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
