import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { TimetableViewSwitcher } from "@/components/teachers/timetable-view-switcher";
import { loadTeacherTimetable } from "@/lib/scheduling";
import { PageHeader } from "@/components/ui/page-header";
import { redirect } from "next/navigation";

export default async function MyTimetablePage() {
  const profile = await getCurrentProfile();
  if (profile.role === "admin") redirect("/teachers");
  if (profile.role === "student") redirect("/dashboard");

  const supabase = await createClient();
  const { data: teacherRow } = await supabase.from("teachers").select("id").eq("profile_id", profile.id).single();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your timetable"
        actions={
          <LinkButton href="/attendance" variant="outline" size="sm">
            Attendance
          </LinkButton>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Timetable ({profile.timezone})</CardTitle>
        </CardHeader>
        <CardContent>
          {teacherRow ? (
            <TimetableViewSwitcherAsync teacherId={teacherRow.id} timezone={profile.timezone} />
          ) : (
            <p className="text-sm text-slate-500">Your teacher profile isn&apos;t set up yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function TimetableViewSwitcherAsync({ teacherId, timezone }: { teacherId: string; timezone: string }) {
  const timetable = await loadTeacherTimetable(teacherId, timezone);
  return <TimetableViewSwitcher days={timetable} timezone={timezone} />;
}
