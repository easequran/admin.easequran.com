import { formatInZone } from "@/lib/utils/timezone";
import { markAttendance } from "@/lib/actions/attendance";
import { Badge } from "@/components/ui/badge";
import type { AttendanceStatus } from "@/lib/types/database";

const OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "excused", label: "Excused" },
];

export function AttendanceRow({
  occurrenceId,
  studentName,
  startAt,
  viewerTimezone,
  currentStatus,
}: {
  occurrenceId: string;
  studentName: string;
  startAt: string;
  viewerTimezone: string;
  currentStatus?: AttendanceStatus;
}) {
  const boundMark = markAttendance.bind(null, occurrenceId);

  return (
    <li className="flex items-center justify-between gap-4 py-3 text-sm">
      <div>
        <p className="font-medium text-primary-900">{studentName}</p>
        <p className="text-slate-500">{formatInZone(startAt, viewerTimezone)}</p>
      </div>
      {currentStatus ? (
        <Badge tone={currentStatus === "present" ? "success" : currentStatus === "absent" ? "danger" : "warning"}>
          {currentStatus}
        </Badge>
      ) : (
        <form action={boundMark} className="flex gap-2">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="submit"
              name="status"
              value={o.value}
              className="rounded-md border border-primary-200 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50"
            >
              {o.label}
            </button>
          ))}
        </form>
      )}
    </li>
  );
}
