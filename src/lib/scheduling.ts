import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { nextOccurrenceUtc } from "@/lib/utils/timezone";
import { createCalendarEvent } from "@/lib/google/calendar";

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

  if (rows.length === 0) return;

  const { data: inserted, error } = await supabase.from("class_occurrences").insert(rows).select("id, start_at, end_at");
  if (error) throw new Error(error.message);

  const [{ data: teacher }, { data: student }] = await Promise.all([
    supabase.from("teachers").select("profiles(full_name, email)").eq("id", schedule.teacher_id).single(),
    supabase.from("students").select("full_name, guardian_email, profiles(email)").eq("id", schedule.student_id).single(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teacherProfile = (teacher as any)?.profiles;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studentEmail = (student as any)?.profiles?.email ?? (student as any)?.guardian_email;

  for (const occurrence of inserted ?? []) {
    try {
      const eventId = await createCalendarEvent({
        summary: `Quran class: ${student?.full_name ?? "Student"} with ${teacherProfile?.full_name ?? "Teacher"}`,
        description: "Ease Quran academy class",
        startAtUtcIso: occurrence.start_at,
        endAtUtcIso: occurrence.end_at,
        attendeeEmails: [teacherProfile?.email, studentEmail].filter(Boolean) as string[],
      });
      if (eventId) {
        await supabase.from("class_occurrences").update({ calendar_event_id: eventId }).eq("id", occurrence.id);
      }
    } catch (err) {
      console.error("Failed to create Google Calendar event for occurrence", occurrence.id, err);
    }
  }
}

/**
 * Creates recurring weekly schedules (and their first batch of occurrences)
 * for a student across one or more days -- shared by student creation and
 * lead-to-student conversion, which both offer the same "assign a teacher
 * now" step. Only a real double-booking (an existing occurrence overlapping
 * the same teacher) blocks a slot; the teacher's declared availability is
 * advisory only here, since an admin manually choosing a specific day/time
 * is a deliberate assignment, not a self-serve booking -- most teachers
 * hadn't populated availability at all, which silently dropped every
 * manual assignment before this changed.
 */
export async function createWeeklySchedulesForStudent(params: {
  studentId: string;
  teacherId: string;
  timezone: string;
  classDays: number[];
  classTime: string;
  classDuration: number;
}): Promise<{ created: number[]; skippedConflict: number[] }> {
  const { studentId, teacherId, timezone, classDays, classTime, classDuration } = params;
  const created: number[] = [];
  const skippedConflict: number[] = [];
  if (!teacherId || classDays.length === 0 || !classTime) return { created, skippedConflict };

  const supabase = await createClient();

  for (const dayOfWeek of classDays) {
    const { startAt, endAt } = nextOccurrenceUtc({
      dayOfWeek,
      localStartTime: classTime,
      timezone,
      durationMinutes: classDuration,
    });

    const conflict = await hasConflict({
      teacherId,
      startAt: startAt.toUTC().toISO()!,
      endAt: endAt.toUTC().toISO()!,
    });
    if (conflict) {
      skippedConflict.push(dayOfWeek);
      continue;
    }

    const { data: schedule } = await supabase
      .from("recurring_schedules")
      .insert({
        student_id: studentId,
        teacher_id: teacherId,
        day_of_week: dayOfWeek,
        local_start_time: classTime,
        timezone,
        duration_minutes: classDuration,
      })
      .select("id")
      .single();

    if (schedule) {
      await generateOccurrencesForSchedule(schedule.id);
      created.push(dayOfWeek);
    }
  }

  return { created, skippedConflict };
}

export interface TimetableBlock {
  startMinutes: number; // minutes since midnight, in the teacher's timezone
  endMinutes: number;
  label?: string;
  isTrial?: boolean;
}

export interface TimetableDay {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  free: TimetableBlock[];
  busy: TimetableBlock[];
}

/**
 * Projects a teacher's declared availability and booked recurring classes
 * onto a single common week, in the teacher's own timezone -- both
 * availability rows and recurring schedules can be declared in whatever
 * timezone they were created with, so this re-resolves each one through
 * `nextOccurrenceUtc` (which is DST-safe) rather than comparing raw
 * HH:mm strings across possibly-different zones.
 */
export function buildWeeklyTimetable(
  availability: { day_of_week: number; local_start_time: string; local_end_time: string; timezone: string }[],
  booked: { day_of_week: number; local_start_time: string; duration_minutes: number; timezone: string; label: string; isTrial?: boolean }[],
  teacherTimezone: string,
): TimetableDay[] {
  const reference = DateTime.now().setZone(teacherTimezone).startOf("week");

  function toTeacherLocal(dayOfWeek: number, localTime: string, timezone: string, durationMinutes: number) {
    const { startAt, endAt } = nextOccurrenceUtc({
      dayOfWeek,
      localStartTime: localTime,
      timezone,
      durationMinutes,
      fromDate: reference,
    });
    const startLocal = startAt.setZone(teacherTimezone);
    const endLocal = endAt.setZone(teacherTimezone);
    return {
      dayOfWeek: startLocal.weekday === 7 ? 0 : startLocal.weekday,
      startMinutes: startLocal.hour * 60 + startLocal.minute,
      endMinutes: startLocal.hour * 60 + startLocal.minute + endAt.diff(startAt, "minutes").minutes,
      spansMidnight: startLocal.hasSame(endLocal, "day") === false,
    };
  }

  const days: TimetableDay[] = Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, free: [], busy: [] }));

  for (const a of availability) {
    const [sh, sm] = a.local_start_time.split(":").map(Number);
    const [eh, em] = a.local_end_time.split(":").map(Number);
    const durationMinutes = eh * 60 + em - (sh * 60 + sm);
    const resolved = toTeacherLocal(a.day_of_week, a.local_start_time, a.timezone, durationMinutes);
    days[resolved.dayOfWeek].free.push({ startMinutes: resolved.startMinutes, endMinutes: resolved.endMinutes });
  }

  for (const b of booked) {
    const resolved = toTeacherLocal(b.day_of_week, b.local_start_time, b.timezone, b.duration_minutes);
    days[resolved.dayOfWeek].busy.push({
      startMinutes: resolved.startMinutes,
      endMinutes: resolved.endMinutes,
      label: b.label,
      isTrial: b.isTrial,
    });
  }

  return days;
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
