import { createClient } from "@/lib/supabase/server";
import { formatInZone } from "@/lib/utils/timezone";
import { AlertTriangle, Sparkles } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";

/**
 * Persistent reminder banners for a teacher -- stay visible (no
 * dismiss/seen-state to manage) until the underlying thing is resolved:
 * a trial assigned to them, or a past class still missing attendance.
 */
export async function TeacherReminders({
  teacherId,
  timezone,
  attendancePath = "/attendance",
}: {
  teacherId: string;
  timezone: string;
  attendancePath?: string;
}) {
  const supabase = await createClient();
  const nowIso = DateTime.utc().toISO()!;

  const [{ data: upcomingTrials }, { data: unmarked }] = await Promise.all([
    supabase
      .from("class_occurrences")
      .select("start_at, leads(full_name)")
      .eq("teacher_id", teacherId)
      .eq("is_trial", true)
      .eq("status", "scheduled")
      .gte("start_at", nowIso)
      .order("start_at")
      .limit(5),
    supabase
      .from("class_occurrences")
      .select("start_at, is_trial, students(full_name), leads(full_name)")
      .eq("teacher_id", teacherId)
      .eq("status", "scheduled")
      .lt("start_at", nowIso)
      .order("start_at")
      .limit(5),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trials = (upcomingTrials ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const missing = (unmarked ?? []) as any[];

  if (trials.length === 0 && missing.length === 0) return null;

  return (
    <div className="space-y-3">
      {trials.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-accent-300 bg-accent-50 px-4 py-3 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary-700" />
          <div>
            <p className="font-medium text-primary-900">
              You have {trials.length} new trial class{trials.length === 1 ? "" : "es"} coming up
            </p>
            <ul className="mt-1 space-y-0.5 text-primary-800">
              {trials.map((t, i) => (
                <li key={i}>
                  {t.leads?.full_name ?? "Trial student"} — {formatInZone(t.start_at, timezone)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div>
            <p className="font-medium text-red-800">
              Please mark attendance for {missing.length} past class{missing.length === 1 ? "" : "es"}
            </p>
            <ul className="mt-1 space-y-0.5 text-red-700">
              {missing.map((m, i) => (
                <li key={i}>
                  {m.students?.full_name ?? m.leads?.full_name ?? "Student"} — {formatInZone(m.start_at, timezone)}
                  {m.is_trial ? " (trial)" : ""}
                </li>
              ))}
            </ul>
            <Link href={attendancePath} className="mt-1.5 inline-block text-red-800 underline">
              Go to attendance
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
