"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatInZone } from "@/lib/utils/timezone";
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

const BUCKET_META: Record<Bucket, { label: string; tone: "danger" | "success" | "info" | "accent" }> = {
  missed: { label: "Missed", tone: "danger" },
  completed: { label: "Completed", tone: "success" },
  ongoing: { label: "Ongoing", tone: "info" },
  upcoming: { label: "Upcoming", tone: "accent" },
};

function bucketOf(o: OccurrenceRow, now: DateTime): Bucket {
  if (o.status === "completed") return "completed";
  const start = DateTime.fromISO(o.start_at);
  const end = DateTime.fromISO(o.end_at);
  if (o.status === "cancelled" || o.status === "no_show") return "completed";
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "ongoing";
  return "missed";
}

export function TodayClassesWidget({
  initialClasses,
  timezone,
}: {
  initialClasses: OccurrenceRow[];
  timezone: string;
}) {
  const [classes, setClasses] = useState(initialClasses);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => {
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
    const now = DateTime.now();
    const grouped: Record<Bucket, OccurrenceRow[]> = { missed: [], completed: [], ongoing: [], upcoming: [] };
    for (const c of classes) grouped[bucketOf(c, now)].push(c);
    return grouped;
  }, [classes]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Today&apos;s classes ({timezone})</CardTitle>
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
                <div key={bucket} className="rounded-lg border border-primary-100">
                  <div className="flex items-center justify-between border-b border-primary-100 px-3 py-2">
                    <span className="text-sm font-medium text-primary-900">{meta.label}</span>
                    <Badge tone={meta.tone}>{rows.length}</Badge>
                  </div>
                  <ul className="max-h-56 divide-y divide-primary-50 overflow-y-auto">
                    {rows.length === 0 ? (
                      <li className="px-3 py-3 text-xs text-slate-400">None</li>
                    ) : (
                      rows.map((c) => (
                        <li key={c.id} className="px-3 py-2 text-xs">
                          <div className="font-medium text-primary-900">
                            {c.studentName}
                            {c.is_trial && (
                              <Badge tone="accent" className="ml-1.5">
                                Trial
                              </Badge>
                            )}
                          </div>
                          <div className="text-slate-500">
                            {c.teacherName} · {formatInZone(c.start_at, timezone)}
                          </div>
                        </li>
                      ))
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
