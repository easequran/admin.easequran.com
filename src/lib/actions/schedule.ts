"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { generateOccurrencesForSchedule, hasConflict, isWithinAvailability } from "@/lib/scheduling";
import { nextOccurrenceUtc } from "@/lib/utils/timezone";
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "@/lib/google/calendar";
import { convertLeadToStudentRecord } from "@/lib/actions/leads";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OccurrenceStatus } from "@/lib/types/database";
import { withToast } from "@/lib/toast";

export async function createRecurringSchedule(formData: FormData) {
  await requireAdmin();
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
  redirect(withToast("/schedule", "Class scheduled"));
}

export async function cancelSchedule(scheduleId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("recurring_schedules").update({ active: false }).eq("id", scheduleId);

  const { data: upcoming } = await supabase
    .from("class_occurrences")
    .select("id, calendar_event_id")
    .eq("recurring_schedule_id", scheduleId)
    .gte("start_at", new Date().toISOString());

  for (const occurrence of upcoming ?? []) {
    if (occurrence.calendar_event_id) {
      await deleteCalendarEvent(occurrence.calendar_event_id).catch(() => {});
    }
  }

  await supabase
    .from("class_occurrences")
    .update({ status: "cancelled" })
    .eq("recurring_schedule_id", scheduleId)
    .gte("start_at", new Date().toISOString());
  revalidatePath("/schedule");
}

/**
 * Sets an occurrence's status -- used both for regular classes and, when the
 * occurrence is a trial, keeps the linked lead's pipeline stage in sync so
 * admin doesn't have to update the trial and the lead separately. A trial
 * that completes converts the lead to a real student (mirroring what
 * marking attendance "present" already does); a trial that's cancelled or
 * a no-show marks the lead lost, unless it was already converted.
 */
export async function updateOccurrenceStatus(occurrenceId: string, status: OccurrenceStatus) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: occurrence } = await supabase
    .from("class_occurrences")
    .select("calendar_event_id, is_trial, lead_id, student_id")
    .eq("id", occurrenceId)
    .single();

  if (status === "cancelled" && occurrence?.calendar_event_id) {
    await deleteCalendarEvent(occurrence.calendar_event_id).catch(() => {});
  }

  const { error } = await supabase
    .from("class_occurrences")
    .update({ status })
    .eq("id", occurrenceId);
  if (error) throw new Error(error.message);

  if (occurrence?.is_trial && occurrence.lead_id) {
    const { data: lead } = await supabase
      .from("leads")
      .select("status")
      .eq("id", occurrence.lead_id)
      .single();

    if (lead?.status !== "converted") {
      if (status === "completed" && !occurrence.student_id) {
        const studentId = await convertLeadToStudentRecord(occurrence.lead_id, "trial");
        await supabase.from("class_occurrences").update({ student_id: studentId }).eq("id", occurrenceId);
        revalidatePath("/students");
      } else if (status === "cancelled" || status === "no_show") {
        await supabase.from("leads").update({ status: "lost" }).eq("id", occurrence.lead_id);
      }
      revalidatePath("/leads");
    }
  }

  revalidatePath("/schedule");
  revalidatePath("/trials");
  revalidatePath("/attendance");
}

export async function bookTrialClass(formData: FormData) {
  await requireAdmin();
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

  const { data: occurrence, error } = await supabase
    .from("class_occurrences")
    .insert({
      lead_id: leadId,
      teacher_id: teacherId,
      is_trial: true,
      start_at: startAt.toUTC().toISO()!,
      end_at: endAt.toUTC().toISO()!,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const [{ data: lead }, { data: teacher }] = await Promise.all([
    leadId ? supabase.from("leads").select("full_name, email").eq("id", leadId).single() : Promise.resolve({ data: null }),
    supabase.from("teachers").select("profiles(full_name, email)").eq("id", teacherId).single(),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teacherProfile = (teacher as any)?.profiles;

  try {
    const eventId = await createCalendarEvent({
      summary: `Trial class: ${lead?.full_name ?? "Prospective student"} with ${teacherProfile?.full_name ?? "Teacher"}`,
      description: "Ease Quran academy trial class",
      startAtUtcIso: startAt.toUTC().toISO()!,
      endAtUtcIso: endAt.toUTC().toISO()!,
      attendeeEmails: [teacherProfile?.email, lead?.email].filter(Boolean) as string[],
    });
    if (eventId) {
      await supabase.from("class_occurrences").update({ calendar_event_id: eventId }).eq("id", occurrence.id);
    }
  } catch (err) {
    console.error("Failed to create Google Calendar event for trial", occurrence.id, err);
  }

  if (leadId) {
    await supabase.from("leads").update({ status: "trial_scheduled" }).eq("id", leadId);
  }

  revalidatePath("/trials");
  revalidatePath("/leads");
  redirect(withToast("/trials", "Trial class booked"));
}

export async function updateTrialClass(occurrenceId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const teacherId = String(formData.get("teacher_id"));
  const startAtLocal = String(formData.get("start_at_local"));
  const timezone = String(formData.get("timezone"));
  const durationMinutes = Number(formData.get("duration_minutes") || 30);

  const { DateTime } = await import("luxon");
  const startAt = DateTime.fromISO(startAtLocal, { zone: timezone });
  const endAt = startAt.plus({ minutes: durationMinutes });

  const conflict = await hasConflict({
    teacherId,
    startAt: startAt.toUTC().toISO()!,
    endAt: endAt.toUTC().toISO()!,
    excludeOccurrenceId: occurrenceId,
  });
  if (conflict) {
    redirect(`/trials/${occurrenceId}?error=${encodeURIComponent("Teacher already has a class at that time.")}`);
  }

  const { data: existing } = await supabase
    .from("class_occurrences")
    .select("calendar_event_id, lead_id")
    .eq("id", occurrenceId)
    .single();

  const { error } = await supabase
    .from("class_occurrences")
    .update({
      teacher_id: teacherId,
      start_at: startAt.toUTC().toISO()!,
      end_at: endAt.toUTC().toISO()!,
    })
    .eq("id", occurrenceId);
  if (error) throw new Error(error.message);

  const [{ data: lead }, { data: teacher }] = await Promise.all([
    existing?.lead_id
      ? supabase.from("leads").select("full_name, email").eq("id", existing.lead_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("teachers").select("profiles(full_name, email)").eq("id", teacherId).single(),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teacherProfile = (teacher as any)?.profiles;

  if (existing?.calendar_event_id) {
    await updateCalendarEvent(existing.calendar_event_id, {
      summary: `Trial class: ${lead?.full_name ?? "Prospective student"} with ${teacherProfile?.full_name ?? "Teacher"}`,
      startAtUtcIso: startAt.toUTC().toISO()!,
      endAtUtcIso: endAt.toUTC().toISO()!,
      attendeeEmails: [teacherProfile?.email, lead?.email].filter(Boolean) as string[],
    }).catch((err) => console.error("Failed to update Google Calendar event", err));
  }

  revalidatePath("/trials");
  revalidatePath(`/trials/${occurrenceId}`);
  redirect(withToast("/trials", "Trial class updated"));
}

export async function cancelTrialClass(occurrenceId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: occurrence } = await supabase
    .from("class_occurrences")
    .select("calendar_event_id, lead_id")
    .eq("id", occurrenceId)
    .single();
  if (occurrence?.calendar_event_id) {
    await deleteCalendarEvent(occurrence.calendar_event_id).catch(() => {});
  }

  const { error } = await supabase
    .from("class_occurrences")
    .update({ status: "cancelled" })
    .eq("id", occurrenceId);
  if (error) throw new Error(error.message);

  if (occurrence?.lead_id) {
    const { data: lead } = await supabase.from("leads").select("status").eq("id", occurrence.lead_id).single();
    if (lead?.status !== "converted") {
      await supabase.from("leads").update({ status: "lost" }).eq("id", occurrence.lead_id);
      revalidatePath("/leads");
    }
  }

  revalidatePath("/trials");
  redirect(withToast("/trials", "Trial class cancelled"));
}
