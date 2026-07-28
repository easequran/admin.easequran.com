import { getCurrentProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatInZone } from "@/lib/utils/timezone";
import { DateTime } from "luxon";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";

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
        .select("id, start_at, is_trial, students(full_name), teachers(profile_id, profiles(full_name))")
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
          <StatCard label="Active students" value={studentCount ?? 0} />
          <StatCard label="Active teachers" value={teacherCount ?? 0} />
          <StatCard label="Open leads" value={activeLeads ?? 0} />
          <Link href="/leads/follow-ups">
            <StatCard
              label="Overdue follow-ups"
              value={overdueFollowUps?.length ?? 0}
              tone={overdueFollowUps && overdueFollowUps.length > 0 ? "danger" : "neutral"}
            />
          </Link>
          <StatCard
            label="Overdue invoices"
            value={`${overdueInvoices?.length ?? 0}`}
            hint={overdueTotal > 0 ? `$${overdueTotal.toFixed(2)} outstanding` : undefined}
            tone={overdueInvoices && overdueInvoices.length > 0 ? "danger" : "neutral"}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s classes ({profile.timezone})</CardTitle>
          </CardHeader>
          <CardContent>
            {!todayClasses || todayClasses.length === 0 ? (
              <p className="text-sm text-slate-500">No classes scheduled for today.</p>
            ) : (
              <ul className="divide-y divide-primary-50">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(todayClasses as any[]).map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <span className="font-medium text-primary-900">
                        {c.students?.full_name ?? "Trial"}
                      </span>
                      <span className="text-slate-400"> with </span>
                      <span className="text-primary-700">
                        {c.teachers?.profiles?.full_name ?? "—"}
                      </span>
                      {c.is_trial && (
                        <Badge tone="accent" className="ml-2">
                          Trial
                        </Badge>
                      )}
                    </div>
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

  if (profile.role === "teacher") {
    const [{ data: upcoming }, { data: teacherRow }] = await Promise.all([
      supabase
        .from("class_occurrences")
        .select("id, start_at, is_trial, students(full_name), teachers!inner(profile_id)")
        .eq("teachers.profile_id", profile.id)
        .gte("start_at", DateTime.utc().toISO()!)
        .order("start_at")
        .limit(10),
      supabase.from("teachers").select("id").eq("profile_id", profile.id).single(),
    ]);

    const { data: weeklySchedule } = teacherRow
      ? await supabase
          .from("recurring_schedules")
          .select("id, day_of_week, local_start_time, duration_minutes, timezone, students(full_name)")
          .eq("teacher_id", teacherRow.id)
          .eq("active", true)
          .order("day_of_week")
      : { data: null };

    const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const byDay = DAY_NAMES.map((name, dayIndex) => ({
      name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: ((weeklySchedule ?? []) as any[])
        .filter((s) => s.day_of_week === dayIndex)
        .sort((a, b) => a.local_start_time.localeCompare(b.local_start_time)),
    }));

    return (
      <div className="space-y-6">
        <PageHeader title="Your upcoming classes" />
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
                    <span className="text-slate-500">{formatInZone(c.start_at, profile.timezone)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your weekly timetable</CardTitle>
          </CardHeader>
          <CardContent>
            {byDay.every((d) => d.items.length === 0) ? (
              <p className="text-sm text-slate-500">No recurring classes assigned yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {byDay
                  .filter((d) => d.items.length > 0)
                  .map((d) => (
                    <div key={d.name} className="rounded-lg border border-primary-100 p-3">
                      <p className="mb-2 text-sm font-semibold text-primary-900">{d.name}</p>
                      <ul className="space-y-1.5">
                        {d.items.map((s) => (
                          <li key={s.id} className="text-sm text-slate-600">
                            <span className="font-medium text-primary-800">{s.local_start_time.slice(0, 5)}</span>{" "}
                            ({s.timezone}) · {s.students?.full_name ?? "Student"} · {s.duration_minutes}m
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
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

function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-slate-500">{label}</p>
        <p className={tone === "danger" ? "text-2xl font-semibold text-red-600" : "text-2xl font-semibold text-primary-900"}>
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </CardContent>
    </Card>
  );
}
