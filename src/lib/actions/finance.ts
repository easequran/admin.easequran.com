"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withToast } from "@/lib/toast";

function parseAmount(formData: FormData): number {
  const amount = Number(formData.get("amount"));
  if (!amount || amount <= 0) {
    redirect(`/finance?error=${encodeURIComponent("Enter a valid amount greater than 0.")}`);
  }
  return amount;
}

export async function addIncome(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const amount = parseAmount(formData);
  const occurredOn = String(formData.get("occurred_on") || "");
  const note = String(formData.get("note") || "").trim() || null;

  const { error } = await supabase
    .from("finance_income")
    .insert({ amount, occurred_on: occurredOn, note, created_by: profile.id });
  if (error) throw new Error(error.message);

  revalidatePath("/finance");
  redirect(withToast("/finance", "Income added"));
}

export async function addExpense(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const amount = parseAmount(formData);
  const occurredOn = String(formData.get("occurred_on") || "");
  const category = String(formData.get("category") || "").trim();
  const paidBy = String(formData.get("paid_by") || "");
  const note = String(formData.get("note") || "").trim() || null;

  const { error } = await supabase
    .from("finance_expenses")
    .insert({ amount, occurred_on: occurredOn, category, paid_by: paidBy, note, created_by: profile.id });
  if (error) throw new Error(error.message);

  revalidatePath("/finance");
  redirect(withToast("/finance", "Expense added"));
}

export async function addDraw(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const amount = parseAmount(formData);
  const occurredOn = String(formData.get("occurred_on") || "");
  const partner = String(formData.get("partner") || "");
  const note = String(formData.get("note") || "").trim() || null;

  const { error } = await supabase
    .from("finance_draws")
    .insert({ amount, occurred_on: occurredOn, partner, note, created_by: profile.id });
  if (error) throw new Error(error.message);

  revalidatePath("/finance");
  redirect(withToast("/finance", "Draw recorded"));
}

export async function deleteFinanceEntry(table: "finance_income" | "finance_expenses" | "finance_draws", id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/finance");
  redirect(withToast("/finance", "Entry deleted"));
}
