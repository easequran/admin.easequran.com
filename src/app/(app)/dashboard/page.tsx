import { getCurrentProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { TeacherDashboardView } from "@/components/teachers/teacher-dashboard-view";
import { AdminDashboardLive } from "@/components/dashboard/admin-dashboard-live";
import { OccurrenceList } from "@/components/schedule/occurrence-list";
import { DateTime } from "luxon";
import { PageHeader } from "@/components/ui/page-header";
import { LayoutDashboard, CalendarClock } from "lucide-react";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  if (profile.role === "admin") {
    const startOfDay = DateTime.utc().startOf("day").toISO();
    const endOfDay = DateTime.utc().endOf("day").toISO();

    const [
      { count: studentCount },
      { count: teacherCount },
      { count: activeLeads },
      { data: todayClasses },
      { data: overdueInvoices },
      { data: overdueFollowUps },
    ] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }).eq("enrollment_status", "active"),
      supabase.from("teachers").select("*", { count: "exact", head: true }).eq("active", true),
      supabase.from("leads").select("*", { count: "exact", head: true }).not("status", "in", "(converted,lost)"),
      supabase
        .from("class_occurrences")
        .select("id, start_at, end_at, status, is_trial, students(full_name), teachers(profile_id, profiles(full_name))")
        .gte("start_at", startOfDay!)
        .lte("start_at", endOfDay!)
        .order("start_at"),
      supabase.from("invoices").select("id, amount, currency").eq("status", "overdue"),
      supabase
        .from("leads")
        .select("id")
        .not("status", "in", "(converted,lost)")
        .not("next_follow_up_at", "is", null)
        .lt("next_follow_up_at", DateTime.utc().toISO()!),
    ]);

    const overdueTotal = (overdueInvoices ?? []).reduce((sum, inv) => sum + Number(inv.amount), 0);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Academy overview"
          description={`Today is ${DateTime.now().setZone(profile.timezone).toFormat("EEEE, MMMM d")}.`}
          icon={LayoutDashboard}
          tone="info"
        />

        <AdminDashboardLive
          timezone={profile.timezone}
          initialStats={{
            studentCount: studentCount ?? 0,
            teacherCount: teacherCount ?? 0,
            activeLeads: activeLeads ?? 0,
            overdueFollowUps: overdueFollowUps?.length ?? 0,
            overdueInvoicesCount: overdueInvoices?.length ?? 0,
            overdueTotal,
          }}
          initialClasses={(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (todayClasses ?? []) as any[]
          ).map((c) => ({
            id: c.id,
            start_at: c.start_at,
            end_at: c.end_at,
            status: c.status,
            is_trial: c.is_trial,
            studentName: c.students?.full_name ?? "Trial",
            teacherName: c.teachers?.profiles?.full_name ?? "—",
          }))}
        />
      </div>
    );
  }

  if (profile.role === "teacher") {
    const { data: teacherRow } = await supabase.from("teachers").select("id").eq("profile_id", profile.id).single();

    return (
      <div className="space-y-6">
        <PageHeader title="Your upcoming classes" icon={CalendarClock} tone="info" />
        {teacherRow ? (
          <TeacherDashboardView
            teacherId={teacherRow.id}
            profileId={profile.id}
            timezone={profile.timezone}
            returnPath="/dashboard"
            timetablePath="/timetable"
          />
        ) : (
          <Card>
            <CardContent>
              <p className="text-sm text-slate-500">Your teacher profile isn&apos;t set up yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // student
  const { data: upcoming } = await supabase
    .from("class_occurrences")
    .select("id, start_at, status, is_trial, teachers(profiles(full_name)), students!inner(profile_id)")
    .eq("students.profile_id", profile.id)
    .gte("start_at", DateTime.utc().toISO()!)
    .order("start_at")
    .limit(10);

  return (
    <div className="space-y-6">
      <PageHeader title="Your upcoming classes" icon={CalendarClock} tone="info" />
      <Card>
        <CardContent>
          <OccurrenceList
            occurrences={(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (upcoming ?? []) as any[]
            ).map((c) => ({
              id: c.id,
              start_at: c.start_at,
              status: c.status,
              is_trial: c.is_trial,
              teacherName: c.teachers?.profiles?.full_name ?? "—",
            }))}
            viewerTimezone={profile.timezone}
          />
        </CardContent>
      </Card>
    </div>
  );
}

