import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceRow } from "@/components/attendance/attendance-row";
import { PageHeader } from "@/components/ui/page-header";
import { DateTime } from "luxon";

export default async function AttendancePage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  let query = supabase
    .from("class_occurrences")
    .select(
      profile.role === "teacher"
        ? "id, start_at, students(full_name), attendance(status), teachers!inner(profile_id)"
        : "id, start_at, students(full_name), attendance(status)",
    )
    .not("student_id", "is", null)
    .lte("start_at", DateTime.utc().toISO()!)
    .order("start_at", { ascending: false })
    .limit(30);

  if (profile.role === "teacher") {
    query = query.eq("teachers.profile_id", profile.id);
  }

  const { data: occurrences } = await query;

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Mark and review attendance for recent classes." />
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
                studentName={o.students?.full_name ?? "Unknown"}
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
