"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withToast } from "@/lib/toast";

export async function createFeePlan(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const studentId = String(formData.get("student_id") || "");
  if (!studentId) throw new Error("Select a student");

  const { error } = await supabase.from("fee_plans").insert({
    student_id: studentId,
    monthly_amount: Number(formData.get("monthly_amount")),
    currency: String(formData.get("currency") || "USD"),
    billing_day: Number(formData.get("billing_day") || 1),
    classes_per_week: Number(formData.get("classes_per_week") || 2),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/fees");
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/invoices");
  redirect(withToast("/fees", "Fee plan added"));
}

export async function updateFeePlan(feePlanId: string, studentId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("fee_plans")
    .update({
      monthly_amount: Number(formData.get("monthly_amount")),
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
