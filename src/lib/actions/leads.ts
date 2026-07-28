"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { logAudit } from "@/lib/actions/audit";
import { createWeeklySchedulesForStudent } from "@/lib/scheduling";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LeadStatus } from "@/lib/types/database";

export async function createLead(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .insert({
      full_name: String(formData.get("full_name")),
      email: String(formData.get("email") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      country: String(formData.get("country") || "") || null,
      timezone: String(formData.get("timezone") || "UTC"),
      source: String(formData.get("source") || "") || null,
      notes: String(formData.get("notes") || "") || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/leads");
  redirect(`/leads/${data.id}`);
}

export async function updateLead(leadId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("leads")
    .update({
      full_name: String(formData.get("full_name")),
      email: String(formData.get("email") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      country: String(formData.get("country") || "") || null,
      timezone: String(formData.get("timezone") || "UTC"),
      source: String(formData.get("source") || "") || null,
      notes: String(formData.get("notes") || "") || null,
    })
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

export async function deleteLead(leadId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: lead } = await supabase.from("leads").select("full_name").eq("id", leadId).single();

  const { error } = await supabase.from("leads").delete().eq("id", leadId);
  if (error) throw new Error(error.message);

  await logAudit({ action: "lead.deleted", entityType: "lead", entityId: leadId, entityLabel: lead?.full_name });

  revalidatePath("/leads");
  redirect("/leads");
}

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  await requireAdmin();
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  const { data: lead } = await supabase.from("leads").select("full_name, status").eq("id", leadId).single();

  // Marking a lead "converted" from the pipeline-stage buttons must actually
  // create the student record too -- previously this only flipped the
  // status column, so the lead never showed up in Students unless the
  // separate "Convert to student" button was used instead.
  if (status === "converted") {
    await convertLeadToStudentRecord(leadId, "active");
  } else {
    const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);
    if (error) throw new Error(error.message);
  }

  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    created_by: user?.id,
    activity_type: "status_change",
    content: `Status changed to ${status}`,
  });

  await logAudit({
    action: "lead.status_changed",
    entityType: "lead",
    entityId: leadId,
    entityLabel: lead?.full_name,
    details: `${lead?.status ?? "?"} → ${status}`,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/students");
}

export async function bulkUpdateLeadStatus(leadIds: string[], status: LeadStatus) {
  await requireAdmin();
  if (leadIds.length === 0) return;
  const supabase = await createClient();

  const { error } = await supabase.from("leads").update({ status }).in("id", leadIds);
  if (error) throw new Error(error.message);

  await logAudit({
    action: "lead.bulk_status_changed",
    entityType: "lead",
    details: `${leadIds.length} lead(s) → ${status}`,
  });

  revalidatePath("/leads");
}

export async function bulkAssignLeads(leadIds: string[], assignedTo: string) {
  await requireAdmin();
  if (leadIds.length === 0) return;
  const supabase = await createClient();

  const { error } = await supabase.from("leads").update({ assigned_to: assignedTo || null }).in("id", leadIds);
  if (error) throw new Error(error.message);

  await logAudit({
    action: "lead.bulk_assigned",
    entityType: "lead",
    details: `${leadIds.length} lead(s) assigned`,
  });

  revalidatePath("/leads");
}

export async function logLeadContact(leadId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  const activityType = String(formData.get("activity_type") || "note");
  const outcome = String(formData.get("outcome") || "") || null;
  const content = String(formData.get("content") || "").trim() || null;
  const nextFollowUpLocal = String(formData.get("next_follow_up_at") || "");

  const { error } = await supabase.from("lead_activities").insert({
    lead_id: leadId,
    created_by: user?.id,
    activity_type: activityType,
    outcome,
    content,
  });
  if (error) throw new Error(error.message);

  const updates: Record<string, string | null> = {};
  if (activityType !== "note") {
    updates.last_contacted_at = new Date().toISOString();
  }
  if (nextFollowUpLocal) {
    updates.next_follow_up_at = new Date(nextFollowUpLocal).toISOString();
  } else if (outcome === "converted" || outcome === "not_interested") {
    updates.next_follow_up_at = null;
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("leads").update(updates).eq("id", leadId);
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
}

/**
 * Shared by the manual "Convert to student" button and the automatic
 * conversion that fires when a trial class is marked attended — both need
 * the same insert-student + mark-lead-converted logic, just with different
 * post-conversion navigation.
 */
export async function convertLeadToStudentRecord(
  leadId: string,
  enrollmentStatus: "trial" | "active" = "active",
): Promise<string> {
  const supabase = await createClient();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).single();
  if (!lead) throw new Error("Lead not found");

  if (lead.converted_student_id) return lead.converted_student_id;

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      full_name: lead.full_name,
      timezone: lead.timezone ?? "UTC",
      country: lead.country,
      guardian_phone: lead.phone,
      guardian_email: lead.email,
      enrollment_status: enrollmentStatus,
      lead_id: lead.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase
    .from("leads")
    .update({ status: "converted", converted_student_id: student.id })
    .eq("id", leadId);

  revalidatePath("/leads");
  revalidatePath("/students");

  return student.id;
}

export async function convertLeadToStudent(leadId: string) {
  await requireAdmin();
  const studentId = await convertLeadToStudentRecord(leadId, "active");
  redirect(`/students/${studentId}`);
}

/** Convert a lead to a student, optionally assigning a teacher + weekly schedule in the same step. */
export async function convertLeadWithAssignment(leadId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const studentId = await convertLeadToStudentRecord(leadId, "active");

  const { data: student } = await supabase.from("students").select("timezone").eq("id", studentId).single();

  const teacherId = String(formData.get("teacher_id") || "");
  const classDays = formData.getAll("class_days").map((d) => Number(d));
  const classTime = String(formData.get("class_time") || "");
  const classDuration = Number(formData.get("class_duration") || 30);

  await createWeeklySchedulesForStudent({
    studentId,
    teacherId,
    timezone: student?.timezone ?? "UTC",
    classDays,
    classTime,
    classDuration,
  });

  revalidatePath("/students");
  revalidatePath("/schedule");
  if (teacherId) revalidatePath(`/teachers/${teacherId}`);
  redirect(`/students/${studentId}`);
}
