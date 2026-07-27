import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatInZone } from "@/lib/utils/timezone";
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
}: {
  occurrences: {
    id: string;
    start_at: string;
    status: OccurrenceStatus;
    is_trial: boolean;
    studentName?: string;
    teacherName?: string;
  }[];
  viewerTimezone: string;
  /** When provided, each row's name links to `${editBasePath}/${id}` for editing. */
  editBasePath?: string;
}) {
  if (occurrences.length === 0) {
    return <p className="text-sm text-slate-500">No classes scheduled.</p>;
  }

  return (
    <ul className="divide-y divide-primary-50">
      {occurrences.map((o) => {
        const label = (
          <>
            <span className="font-medium text-primary-900">{o.studentName ?? "Trial"}</span>
            {o.teacherName && <span className="text-slate-400"> with {o.teacherName}</span>}
            {o.is_trial && (
              <Badge tone="accent" className="ml-2">
                Trial
              </Badge>
            )}
          </>
        );

        return (
          <li key={o.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0">
              {editBasePath ? (
                <Link href={`${editBasePath}/${o.id}`} prefetch={false} className="hover:underline">
                  {label}
                </Link>
              ) : (
                label
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-slate-500">{formatInZone(o.start_at, viewerTimezone)}</span>
              <Badge tone={statusTone[o.status]}>{o.status.replace("_", " ")}</Badge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
