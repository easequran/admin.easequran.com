import { getCurrentProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatInZone } from "@/lib/utils/timezone";
import { TeacherDashboardView } from "@/components/teachers/teacher-dashboard-view";
import { TodayClassesWidget } from "@/components/dashboard/today-classes-widget";
import { DateTime } from "luxon";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { GraduationCap, Users, Target, Clock, CreditCard } from "lucide-react";

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
        <PageHeader title="Academy overview" description={`Today is ${DateTime.now().setZone(profile.timezone).toFormat("EEEE, MMMM d")}.`} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Active students" value={studentCount ?? 0} icon={Users} tone="info" />
          <StatCard label="Active teachers" value={teacherCount ?? 0} icon={GraduationCap} tone="success" />
          <StatCard label="Open leads" value={activeLeads ?? 0} icon={Target} tone="accent" />
          <Link href="/leads/follow-ups">
            <StatCard
              label="Overdue follow-ups"
              value={overdueFollowUps?.length ?? 0}
              icon={Clock}
              tone={overdueFollowUps && overdueFollowUps.length > 0 ? "danger" : "neutral"}
            />
          </Link>
          <StatCard
            label="Overdue invoices"
            value={`${overdueInvoices?.length ?? 0}`}
            hint={overdueTotal > 0 ? `$${overdueTotal.toFixed(2)} outstanding` : undefined}
            icon={CreditCard}
            tone={overdueInvoices && overdueInvoices.length > 0 ? "danger" : "neutral"}
          />
        </div>

        <TodayClassesWidget
          timezone={profile.timezone}
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
        <PageHeader title="Your upcoming classes" />
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
    .select("id, start_at, teachers(profiles(full_name)), students!inner(profile_id)")
    .eq("students.profile_id", profile.id)
    .gte("start_at", DateTime.utc().toISO()!)
    .order("start_at")
    .limit(10);

  return (
    <div className="space-y-6">
      <PageHeader title="Your upcoming classes" />
      <Card>
        <CardContent>
          {!upcoming || upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming classes scheduled.</p>
          ) : (
            <ul className="divide-y divide-primary-50">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(upcoming as any[]).map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium text-primary-900">
                    with {c.teachers?.profiles?.full_name ?? "—"}
                  </span>
                  <span className="text-slate-500">{formatInZone(c.start_at, profile.timezone)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

