"use client";

import { useState } from "react";
import { formatInZone } from "@/lib/utils/timezone";
import { markAttendance, updateAttendanceNote } from "@/lib/actions/attendance";
import { scheduleMakeupClass } from "@/lib/actions/schedule";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/input";
import { FutureDateTimeInput } from "@/components/ui/future-datetime-input";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FOCUS_RING } from "@/lib/utils/focus";
import { toast } from "@/lib/toast";
import { CalendarPlus } from "lucide-react";
import type { AttendanceStatus } from "@/lib/types/database";

const OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "excused", label: "Excused" },
];

export function AttendanceRow({
  occurrenceId,
  studentId,
  teacherId,
  studentName,
  studentTimezone,
  isTrial,
  isMakeup,
  startAt,
  viewerTimezone,
  currentStatus,
  currentNotes,
  canScheduleMakeup,
}: {
  occurrenceId: string;
  studentId?: string | null;
  teacherId?: string | null;
  studentName: string;
  studentTimezone?: string;
  isTrial?: boolean;
  isMakeup?: boolean;
  startAt: string;
  viewerTimezone: string;
  currentStatus?: AttendanceStatus;
  currentNotes?: string | null;
  canScheduleMakeup?: boolean;
}) {
  const [editingNote, setEditingNote] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [schedulingMakeup, setSchedulingMakeup] = useState(false);
  const boundMark = markAttendance.bind(null, occurrenceId);
  const boundUpdateNote = updateAttendanceNote.bind(null, occurrenceId);
  const canBookMakeup = Boolean(canScheduleMakeup && studentId && teacherId && !isTrial);

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
            {isMakeup && (
              <Badge tone="warning" className="ml-2">
                Makeup
              </Badge>
            )}
          </p>
          <p className="text-slate-500">{formatInZone(startAt, viewerTimezone)}</p>
        </div>
        {currentStatus && !editingStatus ? (
          <div className="flex items-center gap-2">
            <Badge tone={currentStatus === "present" ? "success" : currentStatus === "absent" ? "danger" : "warning"}>
              {currentStatus}
            </Badge>
            <button
              type="button"
              onClick={() => setEditingStatus(true)}
              className={`rounded text-xs text-slate-500 hover:text-primary-700 hover:underline ${FOCUS_RING}`}
            >
              Change
            </button>
          </div>
        ) : (
          <form
            action={async (formData) => {
              await boundMark(formData);
              toast.success(`Attendance marked for ${studentName}`);
              setEditingStatus(false);
            }}
            className="flex flex-wrap items-start gap-2"
          >
            {currentStatus ? (
              <input type="hidden" name="notes" value={currentNotes ?? ""} />
            ) : (
              <Textarea
                name="notes"
                rows={1}
                placeholder="Comment (what was covered, progress...)"
                className="w-56"
              />
            )}
            <div className="flex flex-wrap gap-2">
              {OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="submit"
                  name="status"
                  value={o.value}
                  className={`rounded-md border px-2 py-1 text-xs font-medium ${FOCUS_RING} ${
                    o.value === currentStatus
                      ? "border-primary-400 bg-primary-50 text-primary-900"
                      : "border-primary-200 text-primary-700 hover:bg-primary-50"
                  }`}
                >
                  {o.label}
                </button>
              ))}
              {currentStatus && (
                <button
                  type="button"
                  onClick={() => setEditingStatus(false)}
                  className={`rounded-md border border-primary-200 px-2 py-1 text-xs font-medium text-slate-500 hover:bg-primary-50 ${FOCUS_RING}`}
                >
                  Cancel
                </button>
              )}
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
            <SubmitButton size="sm" pendingText="Saving…">
              Save
            </SubmitButton>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditingNote(true)}
            className={`rounded pl-1 text-left text-xs text-slate-500 hover:text-primary-700 hover:underline ${FOCUS_RING}`}
          >
            {currentNotes ? currentNotes : "+ Add teacher comment"}
          </button>
        ))}

      {currentStatus === "excused" && canBookMakeup && (
        <div className="pl-1">
          {schedulingMakeup ? (
            <form
              action={async (formData) => {
                try {
                  await scheduleMakeupClass(studentId!, teacherId!, occurrenceId, formData);
                  toast.success(`Makeup class scheduled for ${studentName}`);
                  setSchedulingMakeup(false);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to schedule makeup class");
                }
              }}
              className="flex flex-wrap items-end gap-2 rounded-lg border border-primary-100 bg-primary-50/50 p-3"
            >
              <div>
                <Label htmlFor={`makeup-time-${occurrenceId}`}>Date & time</Label>
                <FutureDateTimeInput id={`makeup-time-${occurrenceId}`} name="start_at_local" required className="w-56" />
              </div>
              <div>
                <Label htmlFor={`makeup-tz-${occurrenceId}`}>Timezone</Label>
                <TimezoneSelect name="timezone" defaultValue={studentTimezone ?? viewerTimezone} required />
              </div>
              <div>
                <Label htmlFor={`makeup-dur-${occurrenceId}`}>Duration</Label>
                <Select id={`makeup-dur-${occurrenceId}`} name="duration_minutes" defaultValue="30" className="w-32">
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                </Select>
              </div>
              <SubmitButton size="sm" pendingText="Booking…">
                Book makeup class
              </SubmitButton>
              <Button type="button" size="sm" variant="ghost" onClick={() => setSchedulingMakeup(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setSchedulingMakeup(true)}
              className={`flex items-center gap-1.5 rounded text-xs font-medium text-primary-700 hover:underline ${FOCUS_RING}`}
            >
              <CalendarPlus className="h-3.5 w-3.5" /> Schedule makeup class
            </button>
          )}
        </div>
      )}
    </li>
  );
}
