import { DateTime } from "luxon";
import { User, GraduationCap, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatInZone } from "@/lib/utils/timezone";
import { cn } from "@/lib/utils/cn";

export type OccurrenceRow = {
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

/** "01:22:35" / "22:35" -- a clock-style countdown, seconds always visible. */
function formatCountdown(target: DateTime, now: DateTime): string {
  const totalSeconds = Math.max(0, Math.floor(target.diff(now, "seconds").seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  if (hours > 0) return `${hours}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

/** Pure, presentational -- the parent owns fetching/timers and passes `now` down so every countdown ticks in lockstep with the rest of the dashboard. */
export function TodayClassesBoard({
  classes,
  timezone,
  now,
  refreshLabel,
}: {
  classes: OccurrenceRow[];
  timezone: string;
  now: DateTime;
  refreshLabel: string;
}) {
  const buckets: Record<Bucket, OccurrenceRow[]> = { missed: [], completed: [], ongoing: [], upcoming: [] };
  for (const c of classes) buckets[bucketOf(c, now)].push(c);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Today&apos;s classes ({timezone})</CardTitle>
          <p className="text-sm text-slate-400">Local date: {now.toFormat("LLL d, yyyy")}</p>
        </div>
        <span className="text-sm text-slate-400">{refreshLabel}</span>
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
                  <div className={cn("flex items-center justify-between px-4 py-3", meta.headerClass)}>
                    <span className="text-base font-semibold text-white">{meta.label}</span>
                    <span className={cn("flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-sm font-semibold", meta.badgeClass)}>
                      {rows.length}
                    </span>
                  </div>
                  <ul className="max-h-[420px] divide-y divide-primary-50 overflow-y-auto">
                    {rows.length === 0 ? (
                      <li className="px-4 py-4 text-sm text-slate-400">
                        {bucket === "ongoing" ? "No ongoing classes." : "None"}
                      </li>
                    ) : (
                      rows.map((c) => {
                        const start = DateTime.fromISO(c.start_at);
                        return (
                          <li key={c.id} className="px-4 py-3.5 text-sm">
                            <div className="flex items-center gap-2 font-semibold text-primary-900">
                              <User className="h-4 w-4 shrink-0 text-slate-400" />
                              {c.studentName}
                              {c.is_trial && (
                                <Badge tone="accent" className="ml-0.5">
                                  Trial
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1.5 flex items-center gap-2 text-slate-600">
                              <GraduationCap className="h-4 w-4 shrink-0 text-slate-400" />
                              {c.teacherName}
                            </div>
                            <div className="mt-1.5 flex items-center gap-2 text-slate-600">
                              <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                              {formatInZone(c.start_at, timezone)} – {formatInZone(c.end_at, timezone)}
                            </div>
                            {bucket === "upcoming" && (
                              <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1">
                                <Clock className="h-4 w-4 shrink-0 text-slate-900" />
                                <span className="text-xs font-medium text-slate-500">Starting in</span>
                                <span className="font-mono text-base font-bold tabular-nums text-slate-900">
                                  {formatCountdown(start, now)}
                                </span>
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
