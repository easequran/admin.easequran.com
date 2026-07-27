"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EnrollmentStatus } from "@/lib/types/database";
import { generateOccurrencesForSchedule, hasConflict, isWithinAvailability } from "@/lib/scheduling";

export async function createStudent(formData: FormData) {
  const supabase = await createClient();

  const timezone = String(formData.get("timezone") || "UTC");

  const { data, error } = await supabase
    .from("students")
    .insert({
      full_name: String(formData.get("full_name")),
      timezone,
      guardian_name: String(formData.get("guardian_name") || "") || null,
      guardian_email: String(formData.get("guardian_email") || "") || null,
      guardian_phone: String(formData.get("guardian_phone") || "") || null,
      country: String(formData.get("country") || "") || null,
      enrollment_status: (formData.get("enrollment_status") as EnrollmentStatus) || "trial",
      notes: String(formData.get("notes") || "") || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const teacherId = String(formData.get("teacher_id") || "");
  const classDays = formData.getAll("class_days").map((d) => Number(d));
  const classTime = String(formData.get("class_time") || "");
  const classDuration = Number(formData.get("class_duration") || 30);

  if (teacherId && classDays.length > 0 && classTime) {
    const { data: availability } = await supabase
      .from("teacher_availability")
      .select("*")
      .eq("teacher_id", teacherId);

    for (const dayOfWeek of classDays) {
      const withinAvailability = isWithinAvailability(
        { dayOfWeek, localStartTime: classTime, timezone, durationMinutes: classDuration },
        availability ?? [],
      );
      if (!withinAvailability) continue; // skip slots outside availability rather than blocking student creation

      const { nextOccurrenceUtc } = await import("@/lib/utils/timezone");
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
      if (conflict) continue;

      const { data: schedule } = await supabase
        .from("recurring_schedules")
        .insert({
          student_id: data.id,
          teacher_id: teacherId,
          day_of_week: dayOfWeek,
          local_start_time: classTime,
          timezone,
          duration_minutes: classDuration,
        })
        .select("id")
        .single();

      if (schedule) await generateOccurrencesForSchedule(schedule.id);
    }
  }

  revalidatePath("/students");
  revalidatePath("/schedule");
  redirect(`/students/${data.id}`);
}

export async function updateStudent(studentId: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("students")
    .update({
      full_name: String(formData.get("full_name")),
      timezone: String(formData.get("timezone") || "UTC"),
      guardian_name: String(formData.get("guardian_name") || "") || null,
      guardian_email: String(formData.get("guardian_email") || "") || null,
      guardian_phone: String(formData.get("guardian_phone") || "") || null,
      country: String(formData.get("country") || "") || null,
      enrollment_status: (formData.get("enrollment_status") as EnrollmentStatus) || "trial",
      notes: String(formData.get("notes") || "") || null,
    })
    .eq("id", studentId);

  if (error) throw new Error(error.message);

  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
}

export async function deleteStudent(studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("students").delete().eq("id", studentId);
  if (error) throw new Error(error.message);
  revalidatePath("/students");
  redirect("/students");
}
