import Link from "next/link";
import { DateTime } from "luxon";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatInZone } from "@/lib/utils/timezone";

const LOOKAHEAD_DAYS = 7;

/**
 * Persistent reminder of upcoming trials that still have no teacher
 * assigned -- the thing we're actually trying to avoid is a trial's date
 * arriving with nobody lined up to teach it. Only looks a week ahead so
 * this doesn't turn into permanent background noise for trials that
 * genuinely won't be confirmed until closer to the day.
 */
export async function UnconfirmedTrialsBanner({ viewerTimezone }: { viewerTimezone: string }) {
  const supabase = await createClient();
  const nowIso = DateTime.utc().toISO()!;
  const cutoffIso = DateTime.utc().plus({ days: LOOKAHEAD_DAYS }).toISO()!;

  const { data: trials } = await supabase
    .from("class_occurrences")
    .select("id, start_at, pending_teacher_name, leads(full_name)")
    .eq("is_trial", true)
    .eq("status", "scheduled")
    .is("teacher_id", null)
    .gte("start_at", nowIso)
    .lte("start_at", cutoffIso)
    .order("start_at");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (trials ?? []) as any[];
  if (rows.length === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div className="flex-1">
        <p className="font-medium text-amber-900">
          {rows.length} trial{rows.length === 1 ? "" : "s"} in the next {LOOKAHEAD_DAYS} days {rows.length === 1 ? "has" : "have"} no
          teacher assigned yet
        </p>
        <ul className="mt-1 space-y-0.5 text-amber-800">
          {rows.map((t) => (
            <li key={t.id}>
              <Link href={`/trials/${t.id}`} className="hover:underline">
                {t.leads?.full_name ?? "Trial"} — {formatInZone(t.start_at, viewerTimezone)}
              </Link>
              {t.pending_teacher_name && <span className="text-amber-700"> (confirmed: {t.pending_teacher_name}, not added)</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
