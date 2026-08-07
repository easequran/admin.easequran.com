import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { TimetableViewSwitcher } from "@/components/teachers/timetable-view-switcher";
import { loadTeacherTimetable } from "@/lib/scheduling";
import { PageHeader } from "@/components/ui/page-header";
import { notFound } from "next/navigation";

export default async function TeacherTimetablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();

  const { data: teacher } = await supabase
    .from("teachers")
    .select("profiles(full_name, timezone)")
    .eq("id", id)
    .single();
  if (!teacher) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (teacher as any).profiles;
  const teacherTimezone = profile?.timezone ?? "UTC";
  const timetable = await loadTeacherTimetable(id, teacherTimezone, supabase);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${profile?.full_name ?? "Teacher"}'s timetable`}
        backHref={`/teachers/${id}`}
        backLabel="Back to teacher"
        actions={
          <LinkButton href="/attendance" variant="outline" size="sm">
            Attendance
          </LinkButton>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Timetable ({teacherTimezone})</CardTitle>
        </CardHeader>
        <CardContent>
          <TimetableViewSwitcher days={timetable} timezone={teacherTimezone} />
        </CardContent>
      </Card>
    </div>
  );
}
