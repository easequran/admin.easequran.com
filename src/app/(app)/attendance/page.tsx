import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceRow } from "@/components/attendance/attendance-row";
import { PageHeader } from "@/components/ui/page-header";
import { DateTime } from "luxon";

export default async function AttendancePage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  // Trial classes only have a `lead_id` (no `student_id` yet — that gets
  // created automatically once attendance confirms the trial happened), so
  // they must be included here too, not just regular student classes.
  let query = supabase
    .from("class_occurrences")
    .select(
      profile.role === "teacher"
        ? "id, start_at, is_trial, students(full_name), leads(full_name), attendance(status), teachers!inner(profile_id)"
        : "id, start_at, is_trial, students(full_name), leads(full_name), attendance(status)",
    )
    .lte("start_at", DateTime.utc().toISO()!)
    .order("start_at", { ascending: false })
    .limit(30);

  if (profile.role === "teacher") {
    query = query.eq("teachers.profile_id", profile.id);
  }

  const { data: occurrences } = await query;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Mark and review attendance for recent classes and trials."
      />
      <Card>
        <CardHeader>
          <CardTitle>Recent classes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-primary-50">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(occurrences as any[] | null)?.map((o) => (
              <AttendanceRow
                key={o.id}
                occurrenceId={o.id}
                studentName={o.students?.full_name ?? o.leads?.full_name ?? "Unknown"}
                isTrial={o.is_trial}
                startAt={o.start_at}
                viewerTimezone={profile.timezone}
                currentStatus={o.attendance?.[0]?.status}
              />
            ))}
            {(!occurrences || occurrences.length === 0) && (
              <p className="py-4 text-sm text-slate-500">No past classes yet.</p>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
