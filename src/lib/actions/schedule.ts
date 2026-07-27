"use server";

import { createClient } from "@/lib/supabase/server";
import { generateOccurrencesForSchedule, hasConflict, isWithinAvailability } from "@/lib/scheduling";
import { nextOccurrenceUtc } from "@/lib/utils/timezone";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OccurrenceStatus } from "@/lib/types/database";

export async function createRecurringSchedule(formData: FormData) {
  const supabase = await createClient();

  const studentId = String(formData.get("student_id"));
  const teacherId = String(formData.get("teacher_id"));
  const dayOfWeek = Number(formData.get("day_of_week"));
  const localStartTime = String(formData.get("local_start_time"));
  const timezone = String(formData.get("timezone"));
  const durationMinutes = Number(formData.get("duration_minutes"));

  const { data: availability } = await supabase
    .from("teacher_availability")
    .select("*")
    .eq("teacher_id", teacherId);

  const withinAvailability = isWithinAvailability(
    { dayOfWeek, localStartTime, timezone, durationMinutes },
    availability ?? [],
  );
  if (!withinAvailability) {
    redirect(
      `/schedule?error=${encodeURIComponent(
        "That time falls outside the teacher's declared availability.",
      )}`,
    );
  }

  const { startAt, endAt } = nextOccurrenceUtc({
    dayOfWeek,
    localStartTime,
    timezone,
    durationMinutes,
  });

  const conflict = await hasConflict({
    teacherId,
    startAt: startAt.toUTC().toISO()!,
    endAt: endAt.toUTC().toISO()!,
  });
  if (conflict) {
    redirect(`/schedule?error=${encodeURIComponent("Teacher already has a class at that time.")}`);
  }

  const { data: schedule, error } = await supabase
    .from("recurring_schedules")
    .insert({
      student_id: studentId,
      teacher_id: teacherId,
      day_of_week: dayOfWeek,
      local_start_time: localStartTime,
      timezone,
      duration_minutes: durationMinutes,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await generateOccurrencesForSchedule(schedule.id);

  revalidatePath("/schedule");
  redirect("/schedule");
}

export async function cancelSchedule(scheduleId: string) {
  const supabase = await createClient();
  await supabase.from("recurring_schedules").update({ active: false }).eq("id", scheduleId);
  await supabase
    .from("class_occurrences")
    .update({ status: "cancelled" })
    .eq("recurring_schedule_id", scheduleId)
    .gte("start_at", new Date().toISOString());
  revalidatePath("/schedule");
}

export async function updateOccurrenceStatus(occurrenceId: string, status: OccurrenceStatus) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("class_occurrences")
    .update({ status })
    .eq("id", occurrenceId);
  if (error) throw new Error(error.message);
  revalidatePath("/schedule");
}

export async function bookTrialClass(formData: FormData) {
  const supabase = await createClient();

  const leadId = String(formData.get("lead_id") || "") || null;
  const teacherId = String(formData.get("teacher_id"));
  const startAtLocal = String(formData.get("start_at_local")); // yyyy-MM-ddTHH:mm
  const timezone = String(formData.get("timezone"));
  const durationMinutes = Number(formData.get("duration_minutes") || 30);

  const { DateTime } = await import("luxon");
  const startAt = DateTime.fromISO(startAtLocal, { zone: timezone });
  const endAt = startAt.plus({ minutes: durationMinutes });

  const conflict = await hasConflict({
    teacherId,
    startAt: startAt.toUTC().toISO()!,
    endAt: endAt.toUTC().toISO()!,
  });
  if (conflict) {
    redirect(`/trials?error=${encodeURIComponent("Teacher already has a class at that time.")}`);
  }

  const { error } = await supabase.from("class_occurrences").insert({
    lead_id: leadId,
    teacher_id: teacherId,
    is_trial: true,
    start_at: startAt.toUTC().toISO()!,
    end_at: endAt.toUTC().toISO()!,
  });
  if (error) throw new Error(error.message);

  if (leadId) {
    await supabase.from("leads").update({ status: "trial_scheduled" }).eq("id", leadId);
  }

  revalidatePath("/trials");
  revalidatePath("/leads");
  redirect("/trials");
}
