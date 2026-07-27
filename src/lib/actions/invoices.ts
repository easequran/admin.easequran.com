"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { DateTime } from "luxon";

export async function createFeePlan(studentId: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("fee_plans").insert({
    student_id: studentId,
    monthly_amount: Number(formData.get("monthly_amount")),
    currency: String(formData.get("currency") || "USD"),
    billing_day: Number(formData.get("billing_day") || 1),
    classes_per_week: Number(formData.get("classes_per_week") || 2),
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/invoices");
}

/** Generates this month's invoice for every active fee plan that doesn't already have one for the current period. */
export async function generateMonthlyInvoices() {
  const supabase = await createClient();

  const { data: plans } = await supabase.from("fee_plans").select("*").eq("active", true);
  if (!plans || plans.length === 0) return;

  const now = DateTime.utc();
  const periodStart = now.startOf("month").toISODate()!;
  const periodEnd = now.endOf("month").toISODate()!;

  for (const plan of plans) {
    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("student_id", plan.student_id)
      .eq("period_start", periodStart)
      .maybeSingle();
    if (existing) continue;

    const dueDate = now.set({ day: plan.billing_day }).toISODate()!;

    await supabase.from("invoices").insert({
      student_id: plan.student_id,
      fee_plan_id: plan.id,
      period_start: periodStart,
      period_end: periodEnd,
      amount: plan.monthly_amount,
      currency: plan.currency,
      due_date: dueDate,
    });
  }

  revalidatePath("/invoices");
}

export async function markInvoicePaid(invoiceId: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_method: String(formData.get("payment_method") || "") || null,
    })
    .eq("id", invoiceId);
  if (error) throw new Error(error.message);

  revalidatePath("/invoices");
}

export async function markOverdueInvoices() {
  const supabase = await createClient();
  const today = DateTime.utc().toISODate();

  await supabase
    .from("invoices")
    .update({ status: "overdue" })
    .eq("status", "pending")
    .lt("due_date", today);
}
