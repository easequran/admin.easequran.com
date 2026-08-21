"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withToast } from "@/lib/toast";

/**
 * Creates one fee plan per selected student, all with the same
 * amount/currency/billing day/classes-per-week -- covers siblings or any
 * group of students who share one fee arrangement, without changing the
 * underlying one-plan-per-student schema (invoices/billing stay keyed to a
 * single student_id each, just generated from identical sibling plans).
 */
export async function createFeePlan(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const studentIds = formData.getAll("student_id").map(String).filter(Boolean);
  if (studentIds.length === 0) throw new Error("Select at least one student");

  const monthly_amount = Number(formData.get("monthly_amount"));
  if (!(monthly_amount > 0)) throw new Error("Fee amount must be greater than zero");
  const currency = String(formData.get("currency") || "USD");
  const billing_day = Number(formData.get("billing_day") || 1);
  const classes_per_week = Number(formData.get("classes_per_week") || 2);

  const { error } = await supabase
    .from("fee_plans")
    .insert(studentIds.map((student_id) => ({ student_id, monthly_amount, currency, billing_day, classes_per_week })));
  if (error) throw new Error(error.message);

  revalidatePath("/fees");
  for (const id of studentIds) revalidatePath(`/students/${id}`);
  revalidatePath("/invoices");
  redirect(
    withToast(
      "/fees",
      studentIds.length === 1 ? "Fee plan added" : `Fee plan added for ${studentIds.length} students`,
    ),
  );
}

export async function updateFeePlan(feePlanId: string, studentId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const monthly_amount = Number(formData.get("monthly_amount"));
  if (!(monthly_amount > 0)) throw new Error("Fee amount must be greater than zero");

  const { error } = await supabase
    .from("fee_plans")
    .update({
      monthly_amount,
      currency: String(formData.get("currency") || "USD"),
      billing_day: Number(formData.get("billing_day") || 1),
      classes_per_week: Number(formData.get("classes_per_week") || 2),
    })
    .eq("id", feePlanId);
  if (error) throw new Error(error.message);

  revalidatePath("/fees");
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/invoices");
}

/** Deactivates rather than deletes so past invoices keep their fee_plan_id reference intact. */
export async function deactivateFeePlan(feePlanId: string, studentId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("fee_plans").update({ active: false }).eq("id", feePlanId);
  if (error) throw new Error(error.message);

  revalidatePath("/fees");
  revalidatePath(`/students/${studentId}`);
}
