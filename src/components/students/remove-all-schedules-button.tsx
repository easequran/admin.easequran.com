"use client";

import { Button } from "@/components/ui/button";
import { removeAllStudentSchedules } from "@/lib/actions/students";

/**
 * "Remove all" for a student's weekly schedule. Uses the same confirm-on-submit
 * guard pattern as DeleteTrialButton -- a bulk clear is more destructive than
 * the per-row Remove, so it asks first.
 */
export function RemoveAllSchedulesButton({ studentId, count }: { studentId: string; count: number }) {
  return (
    <form
      action={removeAllStudentSchedules.bind(null, studentId)}
      onSubmit={(e) => {
        if (
          !confirm(
            `Remove all ${count} recurring class${count === 1 ? "" : "es"} for this student? ` +
              `Upcoming occurrences will be cleared from the schedule. Past attendance is kept.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="danger" size="sm">
        Remove all
      </Button>
    </form>
  );
}
