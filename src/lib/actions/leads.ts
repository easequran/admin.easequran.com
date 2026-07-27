"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LeadStatus } from "@/lib/types/database";

export async function createLead(formData: FormData) {
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

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);
  if (error) throw new Error(error.message);

  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    created_by: user?.id,
    activity_type: "status_change",
    content: `Status changed to ${status}`,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}

export async function addLeadNote(leadId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const content = String(formData.get("content") || "").trim();
  if (!content) return;

  const { error } = await supabase.from("lead_activities").insert({
    lead_id: leadId,
    created_by: user?.id,
    activity_type: "note",
    content,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/leads/${leadId}`);
}

export async function convertLeadToStudent(leadId: string) {
  const supabase = await createClient();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).single();
  if (!lead) throw new Error("Lead not found");

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      full_name: lead.full_name,
      timezone: lead.timezone ?? "UTC",
      country: lead.country,
      enrollment_status: "active",
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
  redirect(`/students/${student.id}`);
}
