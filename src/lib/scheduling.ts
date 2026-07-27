import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { nextOccurrenceUtc } from "@/lib/utils/timezone";

const GENERATE_WEEKS_AHEAD = 8;

/**
 * Checks whether a proposed weekly slot (day/time/duration in a timezone)
 * falls within any of the teacher's declared availability windows.
 */
export function isWithinAvailability(
  slot: { dayOfWeek: number; localStartTime: string; timezone: string; durationMinutes: number },
  availability: { day_of_week: number; local_start_time: string; local_end_time: string; timezone: string }[],
): boolean {
  const reference = DateTime.now();
  const { startAt: slotStart } = nextOccurrenceUtc({
    dayOfWeek: slot.dayOfWeek,
    localStartTime: slot.localStartTime,
    timezone: slot.timezone,
    durationMinutes: slot.durationMinutes,
    fromDate: reference,
  });
  const slotEnd = slotStart.plus({ minutes: slot.durationMinutes });

  return availability.some((a) => {
    const [sh, sm] = a.local_start_time.split(":").map(Number);
    const [eh, em] = a.local_end_time.split(":").map(Number);

    const availStartLocal = slotStart.setZone(a.timezone).set({
      weekday: (a.day_of_week === 0 ? 7 : a.day_of_week) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      hour: sh,
      minute: sm,
      second: 0,
      millisecond: 0,
    });
    const availEndLocal = availStartLocal.set({ hour: eh, minute: em });

    // align to the same week as the slot for comparison
    const weekDiff = Math.round(slotStart.diff(availStartLocal, "weeks").weeks);
    const alignedStart = availStartLocal.plus({ weeks: weekDiff });
    const alignedEnd = availEndLocal.plus({ weeks: weekDiff });

    return slotStart >= alignedStart && slotEnd <= alignedEnd;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

/** Generates (or tops up) UTC occurrences for a recurring schedule, skipping ones that already exist. */
export async function generateOccurrencesForSchedule(
  scheduleId: string,
  client?: SupabaseLike,
) {
  const supabase = client ?? (await createClient());

  const { data: schedule } = await supabase
    .from("recurring_schedules")
    .select("*")
    .eq("id", scheduleId)
    .single();
  if (!schedule || !schedule.active) return;

  const { data: existing } = await supabase
    .from("class_occurrences")
    .select("start_at")
    .eq("recurring_schedule_id", scheduleId);
  const existingTimes = new Set((existing ?? []).map((o: { start_at: string }) => o.start_at));

  const rows: {
    recurring_schedule_id: string;
    student_id: string;
    teacher_id: string;
    start_at: string;
    end_at: string;
  }[] = [];

  let cursor: DateTime = DateTime.now().setZone(schedule.timezone);
  for (let week = 0; week < GENERATE_WEEKS_AHEAD; week++) {
    const { startAt, endAt } = nextOccurrenceUtc({
      dayOfWeek: schedule.day_of_week,
      localStartTime: schedule.local_start_time,
      timezone: schedule.timezone,
      durationMinutes: schedule.duration_minutes,
      fromDate: cursor,
    });

    const startIso = startAt.toUTC().toISO()!;
    if (!existingTimes.has(startIso)) {
      rows.push({
        recurring_schedule_id: scheduleId,
        student_id: schedule.student_id,
        teacher_id: schedule.teacher_id,
        start_at: startIso,
        end_at: endAt.toUTC().toISO()!,
      });
    }
    cursor = startAt.plus({ weeks: 1 });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("class_occurrences").insert(rows);
    if (error) throw new Error(error.message);
  }
}

/** Checks whether a teacher (or student) already has an occurrence overlapping the given window. */
export async function hasConflict(
  params: {
    teacherId: string;
    studentId?: string;
    startAt: string;
    endAt: string;
    excludeOccurrenceId?: string;
  },
  client?: SupabaseLike,
) {
  const supabase = client ?? (await createClient());

  let query = supabase
    .from("class_occurrences")
    .select("id")
    .eq("teacher_id", params.teacherId)
    .lt("start_at", params.endAt)
    .gt("end_at", params.startAt)
    .neq("status", "cancelled");

  if (params.excludeOccurrenceId) query = query.neq("id", params.excludeOccurrenceId);

  const { data } = await query;
  return (data?.length ?? 0) > 0;
}
