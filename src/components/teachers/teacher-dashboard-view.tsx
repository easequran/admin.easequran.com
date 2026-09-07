import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { OccurrenceList } from "@/components/schedule/occurrence-list";
import { AvailabilityEditor } from "@/components/teachers/availability-editor";
import { TeacherReminders } from "@/components/teachers/teacher-reminders";
import { addAvailability, removeAvailability } from "@/lib/actions/teachers";
import { DateTime } from "luxon";

/** Renders a teacher's own dashboard (upcoming classes, availability) -- shared by the teacher's own /dashboard and the admin's read-through "view dashboard" page, so both stay in sync automatically. Full timetable lives on its own page, linked below. */
export async function TeacherDashboardView({
  teacherId,
  profileId,
  timezone,
  returnPath,
  timetablePath,
  attendancePath = "/attendance",
}: {
  teacherId: string;
  profileId: string;
  timezone: string;
  returnPath: string;
  timetablePath: string;
  attendancePath?: string;
}) {
  const supabase = await createClient();

  // Today's window in the teacher's own timezone, not UTC or the viewer's --
  // a class stored in a student's timezone can resolve to a different
  // calendar day here than it does anywhere else (see lib/scheduling.ts).
  const todayStart = DateTime.now().setZone(timezone).startOf("day");
  const todayEnd = todayStart.endOf("day");

  const [{ data: todayClasses }, { data: upcoming }] = await Promise.all([
    supabase
      .from("class_occurrences")
      .select("id, start_at, status, is_trial, recurring_schedule_id, students(full_name), teachers!inner(profile_id)")
      .eq("teachers.profile_id", profileId)
      .gte("start_at", todayStart.toUTC().toISO()!)
      .lte("start_at", todayEnd.toUTC().toISO()!)
      .order("start_at"),
    supabase
      .from("class_occurrences")
      .select("id, start_at, status, is_trial, recurring_schedule_id, students(full_name), teachers!inner(profile_id)")
      .eq("teachers.profile_id", profileId)
      .gte("start_at", DateTime.utc().toISO()!)
      .order("start_at")
      .limit(10),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapOccurrences = (rows: any[] | null) =>
    (rows ?? []).map((c) => ({
      id: c.id,
      start_at: c.start_at,
      status: c.status,
      is_trial: c.is_trial,
      // Non-trial one-off with no recurring parent = makeup class.
      isMakeup: !c.is_trial && !c.recurring_schedule_id && Boolean(c.students?.full_name),
      studentName: c.students?.full_name ?? "Trial student",
    }));
  const { data: availability } = await supabase
    .from("teacher_availability")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("day_of_week");

  const boundAdd = addAvailability.bind(null, teacherId, returnPath);
  const boundRemove = async (availabilityId: string) => {
    "use server";
    await removeAvailability(teacherId, availabilityId, returnPath);
  };

  return (
    <div className="space-y-6">
      <TeacherReminders teacherId={teacherId} timezone={timezone} attendancePath={attendancePath} />

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s classes ({timezone})</CardTitle>
        </CardHeader>
        <CardContent>
          <OccurrenceList occurrences={mapOccurrences(todayClasses)} viewerTimezone={timezone} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming classes</CardTitle>
        </CardHeader>
        <CardContent>
          <OccurrenceList occurrences={mapOccurrences(upcoming)} viewerTimezone={timezone} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Timetable</CardTitle>
          <div className="flex gap-2">
            <LinkButton href={attendancePath} variant="outline" size="sm">
              Attendance
            </LinkButton>
            <LinkButton href={timetablePath} size="sm">
              View full timetable
            </LinkButton>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">See the full weekly, daily, and monthly schedule on its own page.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Availability ({timezone})</CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityEditor
            teacherTimezone={timezone}
            availability={availability ?? []}
            onAdd={boundAdd}
            onRemove={boundRemove}
          />
        </CardContent>
      </Card>
    </div>
  );
}
