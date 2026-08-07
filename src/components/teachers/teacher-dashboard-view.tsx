import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { formatInZone } from "@/lib/utils/timezone";
import { buildWeeklyTimetable } from "@/lib/scheduling";
import { AvailabilityEditor } from "@/components/teachers/availability-editor";
import { TimetableViewSwitcher } from "@/components/teachers/timetable-view-switcher";
import { addAvailability, removeAvailability } from "@/lib/actions/teachers";
import { DateTime } from "luxon";

/** Renders a teacher's own dashboard (upcoming classes, timetable, availability) -- shared by the teacher's own /dashboard and the admin's read-through "view dashboard" page, so both stay in sync automatically. */
export async function TeacherDashboardView({
  teacherId,
  profileId,
  timezone,
  returnPath,
}: {
  teacherId: string;
  profileId: string;
  timezone: string;
  returnPath: string;
}) {
  const supabase = await createClient();

  const [{ data: upcoming }, { data: weeklySchedule }, { data: availability }] = await Promise.all([
    supabase
      .from("class_occurrences")
      .select("id, start_at, is_trial, students(full_name), teachers!inner(profile_id)")
      .eq("teachers.profile_id", profileId)
      .gte("start_at", DateTime.utc().toISO()!)
      .order("start_at")
      .limit(10),
    supabase
      .from("recurring_schedules")
      .select("id, day_of_week, local_start_time, duration_minutes, timezone, students(full_name, enrollment_status)")
      .eq("teacher_id", teacherId)
      .eq("active", true)
      .order("day_of_week"),
    supabase.from("teacher_availability").select("*").eq("teacher_id", teacherId).order("day_of_week"),
  ]);

  const timetable = buildWeeklyTimetable(
    availability ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((weeklySchedule ?? []) as any[]).map((s) => ({
      day_of_week: s.day_of_week,
      local_start_time: s.local_start_time,
      duration_minutes: s.duration_minutes,
      timezone: s.timezone,
      label: s.students?.full_name ?? "Student",
      isTrial: s.students?.enrollment_status === "trial",
    })),
    timezone,
  );

  const boundAdd = addAvailability.bind(null, teacherId, returnPath);
  const boundRemove = async (formData: FormData) => {
    "use server";
    await removeAvailability(teacherId, String(formData.get("availability_id")), returnPath);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          {!upcoming || upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming classes.</p>
          ) : (
            <ul className="divide-y divide-primary-50">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(upcoming as any[]).map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium text-primary-900">
                    {c.students?.full_name ?? "Trial student"}
                  </span>
                  <span className="text-slate-500">{formatInZone(c.start_at, timezone)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Weekly timetable</CardTitle>
          <LinkButton href="/attendance" variant="outline" size="sm">
            Attendance
          </LinkButton>
        </CardHeader>
        <CardContent>
          <TimetableViewSwitcher days={timetable} timezone={timezone} />
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
