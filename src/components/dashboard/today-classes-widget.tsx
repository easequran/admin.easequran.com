"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { User, GraduationCap, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatInZone } from "@/lib/utils/timezone";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";

const REFRESH_SECONDS = 30;

type OccurrenceRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  is_trial: boolean;
  studentName: string;
  teacherName: string;
};

type Bucket = "missed" | "completed" | "ongoing" | "upcoming";

const BUCKET_META: Record<Bucket, { label: string; headerClass: string; badgeClass: string }> = {
  missed: { label: "Missed", headerClass: "bg-red-600", badgeClass: "bg-white/20 text-white" },
  completed: { label: "Completed", headerClass: "bg-emerald-600", badgeClass: "bg-white/20 text-white" },
  ongoing: { label: "Ongoing", headerClass: "bg-blue-600", badgeClass: "bg-white/20 text-white" },
  upcoming: { label: "Upcoming", headerClass: "bg-teal-600", badgeClass: "bg-white/20 text-white" },
};

function bucketOf(o: OccurrenceRow, now: DateTime): Bucket {
  if (o.status === "completed") return "completed";
  if (o.status === "cancelled" || o.status === "no_show") return "completed";
  const start = DateTime.fromISO(o.start_at);
  const end = DateTime.fromISO(o.end_at);
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "ongoing";
  return "missed";
}

/** "Starting in 1h 01m" / "Starting in 46m 11s" -- mirrors a countdown-style live label. */
function formatCountdown(target: DateTime, now: DateTime): string {
  const diff = target.diff(now, ["hours", "minutes", "seconds"]).toObject();
  const hours = Math.floor(diff.hours ?? 0);
  const minutes = Math.floor(diff.minutes ?? 0);
  const seconds = Math.floor(diff.seconds ?? 0);
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function TodayClassesWidget({
  initialClasses,
  timezone,
}: {
  initialClasses: OccurrenceRow[];
  timezone: string;
}) {
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
      const startOfDay = DateTime.utc().startOf("day").toISO();
      const endOfDay = DateTime.utc().endOf("day").toISO();

      const { data } = await supabase
        .from("class_occurrences")
        .select("id, start_at, end_at, status, is_trial, students(full_name), teachers(profile_id, profiles(full_name))")
        .gte("start_at", startOfDay!)
        .lte("start_at", endOfDay!)
        .order("start_at");

      if (cancelled || !data) return;
      type RawRow = {
        id: string;
        start_at: string;
        end_at: string;
        status: string;
        is_trial: boolean;
        students: { full_name: string } | null;
        teachers: { profiles: { full_name: string } | null } | null;
      };
      setClasses(
        (data as unknown as RawRow[]).map((c) => ({
          id: c.id,
          start_at: c.start_at,
          end_at: c.end_at,
          status: c.status,
          is_trial: c.is_trial,
          studentName: c.students?.full_name ?? "Trial",
          teacherName: c.teachers?.profiles?.full_name ?? "—",
        })),
      );
      setIsRefreshing(false);
    }
    void refresh();
    return () => {
      cancelled = true;
    };
    // Intentionally re-runs every time the countdown wraps back to its
    // starting value, not on every secondsLeft tick.
  }, [secondsLeft]);

  const buckets = useMemo(() => {
    const grouped: Record<Bucket, OccurrenceRow[]> = { missed: [], completed: [], ongoing: [], upcoming: [] };
    for (const c of classes) grouped[bucketOf(c, now)].push(c);
    return grouped;
    // Recomputed every second (via `now`) so a class visibly moves from
    // Upcoming -> Ongoing -> Missed without waiting for the next data refetch.
  }, [classes, now]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Today&apos;s classes ({timezone})</CardTitle>
          <p className="text-xs text-slate-400">Local date: {now.toFormat("LLL d, yyyy")}</p>
        </div>
        <span className="text-xs text-slate-400">
          {isRefreshing ? "Refreshing…" : `Refreshing in 00:${secondsLeft.toString().padStart(2, "0")}`}
        </span>
      </CardHeader>
      <CardContent>
        {classes.length === 0 ? (
          <p className="text-sm text-slate-500">No classes scheduled for today.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(BUCKET_META) as Bucket[]).map((bucket) => {
              const meta = BUCKET_META[bucket];
              const rows = buckets[bucket];
              return (
                <div key={bucket} className="overflow-hidden rounded-lg border border-primary-100">
                  <div className={cn("flex items-center justify-between px-3 py-2.5", meta.headerClass)}>
                    <span className="text-sm font-semibold text-white">{meta.label}</span>
                    <span className={cn("flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold", meta.badgeClass)}>
                      {rows.length}
                    </span>
                  </div>
                  <ul className="max-h-64 divide-y divide-primary-50 overflow-y-auto">
                    {rows.length === 0 ? (
                      <li className="px-3 py-3 text-xs text-slate-400">
                        {bucket === "ongoing" ? "No ongoing classes." : "None"}
                      </li>
                    ) : (
                      rows.map((c) => {
                        const start = DateTime.fromISO(c.start_at);
                        return (
                          <li key={c.id} className="px-3 py-2.5 text-xs">
                            <div className="flex items-center gap-1.5 font-medium text-primary-900">
                              <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              {c.studentName}
                              {c.is_trial && (
                                <Badge tone="accent" className="ml-0.5">
                                  Trial
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-slate-500">
                              <GraduationCap className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              {c.teacherName}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-slate-500">
                              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              {formatInZone(c.start_at, timezone)} – {formatInZone(c.end_at, timezone)}
                            </div>
                            {bucket === "upcoming" && (
                              <div className="mt-1 font-semibold text-teal-700">
                                Starting in {formatCountdown(start, now)}
                              </div>
                            )}
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
