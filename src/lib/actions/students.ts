"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { logAudit } from "@/lib/actions/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EnrollmentStatus } from "@/lib/types/database";
import { generateOccurrencesForSchedule, hasConflict, isWithinAvailability } from "@/lib/scheduling";

export async function createStudent(formData: FormData) {
  await requireAdmin();
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
  await requireAdmin();
  const supabase = await createClient();

  const { data: before } = await supabase
    .from("students")
    .select("full_name, enrollment_status")
    .eq("id", studentId)
    .single();

  const newStatus = (formData.get("enrollment_status") as EnrollmentStatus) || "trial";

  const { error } = await supabase
    .from("students")
    .update({
      full_name: String(formData.get("full_name")),
      timezone: String(formData.get("timezone") || "UTC"),
      guardian_name: String(formData.get("guardian_name") || "") || null,
      guardian_email: String(formData.get("guardian_email") || "") || null,
      guardian_phone: String(formData.get("guardian_phone") || "") || null,
      country: String(formData.get("country") || "") || null,
      enrollment_status: newStatus,
      notes: String(formData.get("notes") || "") || null,
    })
    .eq("id", studentId);

  if (error) throw new Error(error.message);

  if (before && before.enrollment_status !== newStatus) {
    await logAudit({
      action: "student.status_changed",
      entityType: "student",
      entityId: studentId,
      entityLabel: before.full_name,
      details: `${before.enrollment_status} → ${newStatus}`,
    });
  }

  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
}

export async function bulkUpdateStudentStatus(studentIds: string[], status: EnrollmentStatus) {
  await requireAdmin();
  if (studentIds.length === 0) return;
  const supabase = await createClient();

  const { error } = await supabase.from("students").update({ enrollment_status: status }).in("id", studentIds);
  if (error) throw new Error(error.message);

  await logAudit({
    action: "student.bulk_status_changed",
    entityType: "student",
    details: `${studentIds.length} student(s) → ${status}`,
  });

  revalidatePath("/students");
}

export async function deleteStudent(studentId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("full_name").eq("id", studentId).single();

  const { error } = await supabase.from("students").delete().eq("id", studentId);
  if (error) throw new Error(error.message);

  await logAudit({
    action: "student.deleted",
    entityType: "student",
    entityId: studentId,
    entityLabel: student?.full_name,
  });

  revalidatePath("/students");
  redirect("/students");
}
