"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { logAudit } from "@/lib/actions/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EnrollmentStatus } from "@/lib/types/database";
import { createWeeklySchedulesForStudent } from "@/lib/scheduling";

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

  await createWeeklySchedulesForStudent({
    studentId: data.id,
    teacherId,
    timezone,
    classDays,
    classTime,
    classDuration,
  });

  revalidatePath("/students");
  revalidatePath("/schedule");
  if (teacherId) revalidatePath(`/teachers/${teacherId}`);
  redirect(`/students/${data.id}`);
}

/** Adds one or more weekly recurring classes to an existing student, e.g. assigning their first teacher after conversion. */
export async function addStudentSchedule(studentId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("timezone").eq("id", studentId).single();
  if (!student) throw new Error("Student not found");

  const teacherId = String(formData.get("teacher_id") || "");
  const classDays = formData.getAll("class_days").map((d) => Number(d));
  const classTime = String(formData.get("class_time") || "");
  const classDuration = Number(formData.get("class_duration") || 30);

  await createWeeklySchedulesForStudent({
    studentId,
    teacherId,
    timezone: student.timezone,
    classDays,
    classTime,
    classDuration,
  });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/schedule");
  if (teacherId) revalidatePath(`/teachers/${teacherId}`);
}

/** Deactivates a recurring schedule and cancels its not-yet-happened occurrences. */
export async function removeStudentSchedule(scheduleId: string, studentId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: schedule } = await supabase
    .from("recurring_schedules")
    .select("teacher_id")
    .eq("id", scheduleId)
    .single();

  const { error } = await supabase
    .from("recurring_schedules")
    .update({ active: false, end_date: new Date().toISOString().slice(0, 10) })
    .eq("id", scheduleId);
  if (error) throw new Error(error.message);

  await supabase
    .from("class_occurrences")
    .update({ status: "cancelled" })
    .eq("recurring_schedule_id", scheduleId)
    .eq("status", "scheduled")
    .gte("start_at", new Date().toISOString());

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/schedule");
  if (schedule?.teacher_id) revalidatePath(`/teachers/${schedule.teacher_id}`);
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
