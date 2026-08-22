"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import type { InvoiceStatus } from "@/lib/types/database";
import { withToast } from "@/lib/toast";

/** Generates this month's invoice for every active fee plan that doesn't already have one for the current period. */
export async function generateMonthlyInvoices() {
  await requireAdmin();
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
      sibling_group_id: plan.sibling_group_id,
    });
  }

  revalidatePath("/invoices");
}

export async function markInvoicePaid(invoiceId: string, formData: FormData) {
  await requireAdmin();
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
  redirect(withToast("/invoices", "Invoice marked as paid"));
}

export async function updateInvoice(invoiceId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const status = String(formData.get("status") || "pending") as InvoiceStatus;
  const amount = Number(formData.get("amount"));
  if (!(amount > 0)) throw new Error("Amount must be greater than zero");

  const { error } = await supabase
    .from("invoices")
    .update({
      amount,
      currency: String(formData.get("currency") || "USD"),
      due_date: String(formData.get("due_date")),
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
      notes: String(formData.get("notes") || "").trim() || null,
    })
    .eq("id", invoiceId);
  if (error) throw new Error(error.message);

  revalidatePath("/invoices");
  revalidatePath("/students/[id]", "page");
}

export async function deleteInvoice(invoiceId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
  if (error) throw new Error(error.message);

  revalidatePath("/invoices");
  revalidatePath("/students/[id]", "page");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function markOverdueInvoices(client?: any) {
  const supabase = client ?? (await createClient());
  const today = DateTime.utc().toISODate();

  await supabase
    .from("invoices")
    .update({ status: "overdue" })
    .eq("status", "pending")
    .lt("due_date", today);
}
