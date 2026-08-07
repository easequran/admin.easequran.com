import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceRow } from "@/components/attendance/attendance-row";
import { AttendanceTeacherFilter } from "@/components/attendance/attendance-teacher-filter";
import { PageHeader } from "@/components/ui/page-header";
import { DateTime } from "luxon";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ teacherId?: string }>;
}) {
  const profile = await getCurrentProfile();
  const { teacherId } = await searchParams;
  const supabase = await createClient();

  // Trial classes only have a `lead_id` (no `student_id` yet — that gets
  // created automatically once attendance confirms the trial happened), so
  // they must be included here too, not just regular student classes.
  let query = supabase
    .from("class_occurrences")
    .select(
      profile.role === "teacher"
        ? "id, start_at, is_trial, students(full_name), leads(full_name), attendance(status, notes), teachers!inner(profile_id)"
        : "id, start_at, is_trial, students(full_name), leads(full_name), attendance(status, notes), teachers(id, profiles(full_name))",
    )
    .lte("start_at", DateTime.utc().toISO()!)
    .order("start_at", { ascending: false })
    .limit(30);

  if (profile.role === "teacher") {
    query = query.eq("teachers.profile_id", profile.id);
  } else if (profile.role === "admin" && teacherId) {
    query = query.eq("teacher_id", teacherId);
  }

  const [{ data: occurrences }, { data: teachers }] = await Promise.all([
    query,
    profile.role === "admin"
      ? supabase.from("teachers").select("id, profiles(full_name)").eq("active", true)
      : Promise.resolve({ data: null }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teacherOptions = ((teachers ?? []) as any[])
    .map((t) => ({ id: t.id as string, fullName: t.profiles?.full_name ?? "Teacher" }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Mark and review attendance for recent classes and trials."
        actions={
          profile.role === "admin" ? (
            <AttendanceTeacherFilter teachers={teacherOptions} selectedTeacherId={teacherId ?? ""} />
          ) : undefined
        }
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
                currentStatus={o.attendance?.status}
                currentNotes={o.attendance?.notes}
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
