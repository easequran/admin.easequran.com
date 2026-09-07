"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withToast } from "@/lib/toast";
import { logAudit } from "@/lib/actions/audit";
import { DateTime } from "luxon";
import { syncClassBilling } from "@/lib/billing/sync-class-billing";

/**
 * Pulls and validates the fields specific to the chosen billing mode, and
 * explicitly nulls the other mode's fields so a plan is always internally
 * consistent (and satisfies fee_plans_mode_fields_ck) after a mode switch.
 */
function parseModeFields(mode: "monthly" | "per_block", formData: FormData) {
  if (mode === "per_block") {
    const classes_per_block = Number(formData.get("classes_per_block"));
    const block_amount = Number(formData.get("block_amount"));
    const grace_days = Number(formData.get("grace_days") ?? 3);
    if (!Number.isInteger(classes_per_block) || classes_per_block < 1 || classes_per_block > 60)
      throw new Error("Classes per block must be a whole number between 1 and 60");
    if (!(block_amount > 0)) throw new Error("Block amount must be greater than zero");
    if (!(grace_days >= 0 && grace_days <= 60)) throw new Error("Days until due must be between 0 and 60");

    const sinceRaw = String(formData.get("block_billing_since") || "").trim();
    const block_billing_since = /^\d{4}-\d{2}-\d{2}$/.test(sinceRaw) ? sinceRaw : DateTime.utc().toISODate()!;

    return { monthly_amount: null, billing_day: 1, classes_per_block, block_amount, grace_days, block_billing_since };
  }

  const monthly_amount = Number(formData.get("monthly_amount"));
  if (!(monthly_amount > 0)) throw new Error("Fee amount must be greater than zero");
  const billing_day = Number(formData.get("billing_day") || 1);
  if (!(billing_day >= 1 && billing_day <= 28)) throw new Error("Fee date must be a day between 1 and 28");

  return {
    monthly_amount,
    billing_day,
    classes_per_block: null,
    block_amount: null,
    grace_days: 3,
    block_billing_since: null,
  };
}

/**
 * Splits a whole-group fee evenly across `parts` siblings, working in minor
 * units so the shares always sum back to exactly `total` (any rounding
 * remainder is spread one penny at a time onto the first siblings).
 * e.g. 64 / 2 -> [32, 32]; 64 / 3 -> [21.34, 21.33, 21.33].
 */
function splitAmountEvenly(total: number, parts: number): number[] {
  if (parts <= 1) return [Math.round(total * 100) / 100];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / parts);
  const remainder = cents - base * parts;
  const shares = Array.from({ length: parts }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
  if (shares.some((s) => s <= 0)) {
    throw new Error(`Fee of ${total} is too small to split across ${parts} siblings`);
  }
  return shares;
}

/**
 * Creates one fee plan per selected student. A single student gets one plan
 * with the amount as entered. When several students are selected they're a
 * sibling group: every row is durably tagged with the same sibling_group_id,
 * the entered amount is treated as the WHOLE family's fee and split evenly
 * across the siblings (see splitAmountEvenly), and from then on the group is
 * always edited/deactivated together and its invoices combine into one PDF.
 */
export async function createFeePlan(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const studentIds = formData.getAll("student_id").map(String).filter(Boolean);
  if (studentIds.length === 0) throw new Error("Select at least one student");

  const currency = String(formData.get("currency") || "USD");
  const classes_per_week = Number(formData.get("classes_per_week") || 2);
  const billing_mode = String(formData.get("billing_mode") || "monthly") === "per_block" ? "per_block" : "monthly";
  const isSiblingGroup = studentIds.length > 1;
  const siblingGroupId = isSiblingGroup ? crypto.randomUUID() : null;

  const shared = parseModeFields(billing_mode, formData);
  const amountField = billing_mode === "per_block" ? "block_amount" : "monthly_amount";
  const enteredAmount = Number(shared[amountField]);

  // Sibling groups: the entered amount is the whole family's fee -> split it
  // evenly so each child's own invoice/record carries their share and the
  // parts add back up to exactly what was entered.
  const shares = isSiblingGroup
    ? splitAmountEvenly(enteredAmount, studentIds.length)
    : [enteredAmount];

  const { error } = await supabase.from("fee_plans").insert(
    studentIds.map((student_id, idx) => ({
      student_id,
      currency,
      classes_per_week,
      billing_mode,
      sibling_group_id: siblingGroupId,
      ...shared,
      [amountField]: shares[idx],
    })),
  );
  if (error) throw new Error(error.message);

  await logAudit({
    action: "fee_plan.create",
    entityType: "fee_plan",
    entityId: siblingGroupId,
    entityLabel: isSiblingGroup ? `${studentIds.length} students (sibling group)` : undefined,
    details:
      billing_mode === "per_block"
        ? `${currency} ${enteredAmount}${isSiblingGroup ? ` family total (split ${shares.join("/")})` : ""} per ${shared.classes_per_block} classes, due +${shared.grace_days}d, counting from ${shared.block_billing_since}, ${studentIds.length} plan(s) created by ${profile.full_name}`
        : `${currency} ${enteredAmount}${isSiblingGroup ? ` family total (split ${shares.join("/")})` : ""}/mo, billing day ${shared.billing_day}, ${studentIds.length} plan(s) created by ${profile.full_name}`,
  });

  // Advance billing: raise each student's first set invoice right away.
  if (billing_mode === "per_block") {
    for (const sid of studentIds) {
      try {
        await syncClassBilling(supabase, sid);
      } catch (err) {
        console.error("syncClassBilling failed after createFeePlan", err);
      }
    }
  }

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

/**
 * Resolves which fee_plans rows an edit/deactivate should touch. A sibling
 * plan is one row per student sharing a sibling_group_id (see createFeePlan)
 * and is always managed as a unit -- so every active row in the group is
 * returned, in a stable order (by student_id) so the amount split lines up
 * run to run. A non-sibling plan just returns its own single row.
 */
async function resolveFeePlanTargets(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  feePlanId: string,
  studentId: string,
): Promise<{ ids: string[]; studentIds: string[] }> {
  const { data: current } = await supabase
    .from("fee_plans")
    .select("sibling_group_id")
    .eq("id", feePlanId)
    .single();
  if (!current?.sibling_group_id) return { ids: [feePlanId], studentIds: [studentId] };

  const { data: groupRows } = await supabase
    .from("fee_plans")
    .select("id, student_id")
    .eq("sibling_group_id", current.sibling_group_id)
    .eq("active", true)
    .order("student_id");
  if (!groupRows || groupRows.length === 0) return { ids: [feePlanId], studentIds: [studentId] };

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ids: groupRows.map((r: any) => r.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    studentIds: groupRows.map((r: any) => r.student_id),
  };
}

export async function updateFeePlan(feePlanId: string, studentId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const billing_mode =
    String(formData.get("billing_mode") || "monthly") === "per_block" ? "per_block" : "monthly";
  const shared = parseModeFields(billing_mode, formData);
  const amountField = billing_mode === "per_block" ? "block_amount" : "monthly_amount";
  const enteredAmount = Number(shared[amountField]);

  const { ids, studentIds } = await resolveFeePlanTargets(supabase, feePlanId, studentId);

  // For a sibling group the amount entered is the whole family's fee -> split
  // it evenly across the group's rows; a lone plan takes the amount as-is.
  const shares =
    ids.length > 1 ? splitAmountEvenly(enteredAmount, ids.length) : [enteredAmount];

  const base = {
    currency: String(formData.get("currency") || "USD"),
    classes_per_week: Number(formData.get("classes_per_week") || 2),
    billing_mode,
    ...shared,
  };

  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase
      .from("fee_plans")
      .update({ ...base, [amountField]: shares[i] })
      .eq("id", ids[i]);
    if (error) throw new Error(error.message);

    // Keep still-unpaid invoices for this plan in step with the new amount --
    // otherwise a corrected fee leaves stale bills (e.g. the £64-each invoice
    // a sibling plan raised before its family total was split). Paid and
    // cancelled invoices are historical and left alone.
    const { error: invErr } = await supabase
      .from("invoices")
      .update({ amount: shares[i], currency: base.currency })
      .eq("fee_plan_id", ids[i])
      .in("status", ["pending", "overdue"]);
    if (invErr) throw new Error(invErr.message);
  }

  // Now on per_block: an older "count from" date may mean a block is already
  // complete -- generate it. Never let a billing hiccup fail the plan edit.
  if (billing_mode === "per_block") {
    for (const sid of studentIds) {
      try {
        await syncClassBilling(supabase, sid);
      } catch (err) {
        console.error("syncClassBilling failed after updateFeePlan", err);
      }
    }
  }

  revalidatePath("/fees");
  for (const sid of studentIds) revalidatePath(`/students/${sid}`);
  revalidatePath("/invoices");
}

/** Deactivates rather than deletes so past invoices keep their fee_plan_id reference intact. Sibling plans deactivate as a group. */
export async function deactivateFeePlan(feePlanId: string, studentId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { ids, studentIds } = await resolveFeePlanTargets(supabase, feePlanId, studentId);

  const { error } = await supabase.from("fee_plans").update({ active: false }).in("id", ids);
  if (error) throw new Error(error.message);

  revalidatePath("/fees");
  for (const sid of studentIds) revalidatePath(`/students/${sid}`);
}
