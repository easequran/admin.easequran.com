"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { GraduationCap, Users, Target, Clock, CreditCard } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { TodayClassesBoard, type OccurrenceRow } from "@/components/dashboard/today-classes-widget";
import { createClient } from "@/lib/supabase/client";

const REFRESH_SECONDS = 30;

type AdminStats = {
  studentCount: number;
  teacherCount: number;
  activeLeads: number;
  overdueFollowUps: number;
  overdueInvoicesCount: number;
  overdueTotal: number;
};

type RawOccurrenceRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  is_trial: boolean;
  students: { full_name: string } | null;
  teachers: { profiles: { full_name: string } | null } | null;
};

/**
 * Owns one shared 30s refresh cycle for the whole admin dashboard -- the
 * stat tiles and the Today's classes board refetch together, and the
 * on-screen clock (`now`) ticks every second so countdowns stay live
 * between refetches.
 */
export function AdminDashboardLive({
  initialStats,
  initialClasses,
  timezone,
}: {
  initialStats: AdminStats;
  initialClasses: OccurrenceRow[];
  timezone: string;
}) {
  const [stats, setStats] = useState(initialStats);
  const [classes, setClasses] = useState(initialClasses);
  const [now, setNow] = useState(() => DateTime.now());
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => {
      setNow(DateTime.now());
      setSecondsLeft((s) => (s <= 1 ? REFRESH_SECONDS : s - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (secondsLeft !== REFRESH_SECONDS) return;

    let cancelled = false;
    async function refresh() {
      setIsRefreshing(true);
      const supabase = createClient();
      const startOfDay = DateTime.utc().startOf("day").toISO()!;
      const endOfDay = DateTime.utc().endOf("day").toISO()!;
      const nowIso = DateTime.utc().toISO()!;

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
          .gte("start_at", startOfDay)
          .lte("start_at", endOfDay)
          .order("start_at"),
        supabase.from("invoices").select("id, amount, currency").eq("status", "overdue"),
        supabase
          .from("leads")
          .select("id")
          .not("status", "in", "(converted,lost)")
          .not("next_follow_up_at", "is", null)
          .lt("next_follow_up_at", nowIso),
      ]);

      if (cancelled) return;

      const overdueTotal = (overdueInvoices ?? []).reduce((sum, inv) => sum + Number(inv.amount), 0);
      setStats({
        studentCount: studentCount ?? 0,
        teacherCount: teacherCount ?? 0,
        activeLeads: activeLeads ?? 0,
        overdueFollowUps: overdueFollowUps?.length ?? 0,
        overdueInvoicesCount: overdueInvoices?.length ?? 0,
        overdueTotal,
      });

      if (todayClasses) {
        setClasses(
          (todayClasses as unknown as RawOccurrenceRow[]).map((c) => ({
            id: c.id,
            start_at: c.start_at,
            end_at: c.end_at,
            status: c.status,
            is_trial: c.is_trial,
            studentName: c.students?.full_name ?? "Trial",
            teacherName: c.teachers?.profiles?.full_name ?? "—",
          })),
        );
      }
      setIsRefreshing(false);
    }
    void refresh();
    return () => {
      cancelled = true;
    };
    // Intentionally re-runs every time the countdown wraps back to its
    // starting value, not on every secondsLeft tick.
  }, [secondsLeft]);

  const refreshLabel = isRefreshing ? "Refreshing…" : `Refreshing in 00:${secondsLeft.toString().padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Active students" value={stats.studentCount} icon={Users} tone="info" />
        <StatCard label="Active teachers" value={stats.teacherCount} icon={GraduationCap} tone="success" />
        <StatCard label="Open leads" value={stats.activeLeads} icon={Target} tone="accent" />
        <StatCard
          label="Overdue follow-ups"
          value={stats.overdueFollowUps}
          icon={Clock}
          tone={stats.overdueFollowUps > 0 ? "danger" : "neutral"}
          href="/leads/follow-ups"
        />
        <StatCard
          label="Overdue invoices"
          value={stats.overdueInvoicesCount}
          hint={stats.overdueTotal > 0 ? `$${stats.overdueTotal.toFixed(2)} outstanding` : undefined}
          icon={CreditCard}
          tone={stats.overdueInvoicesCount > 0 ? "danger" : "neutral"}
          href="/invoices"
        />
      </div>

      <TodayClassesBoard classes={classes} timezone={timezone} now={now} refreshLabel={refreshLabel} />
    </div>
  );
}
