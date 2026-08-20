"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { User, GraduationCap, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { formatInZone } from "@/lib/utils/timezone";
import { formatCountdown } from "@/lib/utils/countdown";
import { updateOccurrenceStatus } from "@/lib/actions/schedule";
import type { OccurrenceStatus } from "@/lib/types/database";

const statusTone: Record<OccurrenceStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  scheduled: "info",
  completed: "success",
  cancelled: "neutral",
  no_show: "danger",
  rescheduled: "warning",
};

export function OccurrenceList({
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
  /** When provided, each row's name links to `${editBasePath}/${id}` for editing. */
  editBasePath?: string;
  /** Show Completed / Didn't show / Cancel quick actions on scheduled rows (trials only). */
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
    <ul className="divide-y divide-primary-50">
      {occurrences.map((o) => {
        const start = DateTime.fromISO(o.start_at);
        const isFutureScheduled = o.status === "scheduled" && start > now;

        const label = (
          <>
            {o.studentName !== undefined ? (
              <>
                <div className="flex items-center gap-2 font-semibold text-primary-900">
                  <User className="h-4 w-4 shrink-0 text-slate-400" />
                  {o.studentName || "Trial"}
                  {o.is_trial && (
                    <Badge tone="accent" className="ml-0.5">
                      Trial
                    </Badge>
                  )}
                </div>
                {o.teacherName && (
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                    <GraduationCap className="h-4 w-4 shrink-0 text-slate-400" />
                    {o.teacherName}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 font-semibold text-primary-900">
                <GraduationCap className="h-4 w-4 shrink-0 text-slate-400" />
                With {o.teacherName ?? "—"}
                {o.is_trial && (
                  <Badge tone="accent" className="ml-0.5">
                    Trial
                  </Badge>
                )}
              </div>
            )}
          </>
        );

        return (
          <li key={o.id} className="flex flex-col gap-2 py-3.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0">
              {editBasePath ? (
                <Link href={`${editBasePath}/${o.id}`} prefetch={false} className="hover:underline">
                  {label}
                </Link>
              ) : (
                label
              )}
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                {formatInZone(o.start_at, viewerTimezone)}
              </div>
              {isFutureScheduled && (
                <div className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1">
                  <Clock className="h-4 w-4 shrink-0 text-slate-900" />
                  <span className="text-xs font-medium text-slate-500">Starting in</span>
                  <span className="font-mono text-base font-bold tabular-nums text-slate-900">
                    {formatCountdown(start, now)}
                  </span>
                </div>
              )}
              {showStatusActions && o.status === "scheduled" ? (
                <div className="flex items-center gap-1.5">
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
            </div>
          </li>
        );
      })}
    </ul>
  );
}
