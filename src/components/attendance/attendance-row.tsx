"use client";

import { useState } from "react";
import { formatInZone } from "@/lib/utils/timezone";
import { markAttendance, updateAttendanceNote } from "@/lib/actions/attendance";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
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
  isTrial,
  startAt,
  viewerTimezone,
  currentStatus,
  currentNotes,
}: {
  occurrenceId: string;
  studentName: string;
  isTrial?: boolean;
  startAt: string;
  viewerTimezone: string;
  currentStatus?: AttendanceStatus;
  currentNotes?: string | null;
}) {
  const [editingNote, setEditingNote] = useState(false);
  const boundMark = markAttendance.bind(null, occurrenceId);
  const boundUpdateNote = updateAttendanceNote.bind(null, occurrenceId);

  return (
    <li className="flex flex-col gap-2 py-3 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="font-medium text-primary-900">
            {studentName}
            {isTrial && (
              <Badge tone="accent" className="ml-2">
                Trial
              </Badge>
            )}
          </p>
          <p className="text-slate-500">{formatInZone(startAt, viewerTimezone)}</p>
        </div>
        {currentStatus ? (
          <Badge
            className="w-fit"
            tone={currentStatus === "present" ? "success" : currentStatus === "absent" ? "danger" : "warning"}
          >
            {currentStatus}
          </Badge>
        ) : (
          <form
            action={async (formData) => {
              await boundMark(formData);
              toast.success(`Attendance marked for ${studentName}`);
            }}
            className="flex flex-wrap items-start gap-2"
          >
            <Textarea
              name="notes"
              rows={1}
              placeholder="Comment (what was covered, progress...)"
              className="w-56"
            />
            <div className="flex flex-wrap gap-2">
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
            </div>
          </form>
        )}
      </div>

      {currentStatus &&
        (editingNote ? (
          <form
            action={async (formData) => {
              await boundUpdateNote(formData);
              toast.success("Comment saved");
              setEditingNote(false);
            }}
            className="flex flex-wrap items-start gap-2 pl-1"
          >
            <Textarea name="notes" rows={2} defaultValue={currentNotes ?? ""} className="w-full sm:w-80" />
            <Button type="submit" size="sm">
              Save
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditingNote(true)}
            className="pl-1 text-left text-xs text-slate-500 hover:text-primary-700 hover:underline"
          >
            {currentNotes ? currentNotes : "+ Add teacher comment"}
          </button>
        ))}
    </li>
  );
}
