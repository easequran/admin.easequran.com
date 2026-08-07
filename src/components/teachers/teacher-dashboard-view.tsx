import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { formatInZone } from "@/lib/utils/timezone";
import { AvailabilityEditor } from "@/components/teachers/availability-editor";
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

  const { data: upcoming } = await supabase
    .from("class_occurrences")
    .select("id, start_at, is_trial, students(full_name), teachers!inner(profile_id)")
    .eq("teachers.profile_id", profileId)
    .gte("start_at", DateTime.utc().toISO()!)
    .order("start_at")
    .limit(10);
  const { data: availability } = await supabase
    .from("teacher_availability")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("day_of_week");

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
