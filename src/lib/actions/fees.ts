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
 * Creates one fee plan per selected student, all with the same
 * amount/currency/billing day/classes-per-week -- covers siblings or any
 * group of students who share one fee arrangement. When more than one
 * student is selected, every resulting row is durably tagged with the same
 * sibling_group_id (not just a one-time convenience insert), so their
 * invoices can always be found and combined into one PDF later, even if
 * each plan is edited separately afterwards.
 */
export async function createFeePlan(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const studentIds = formData.getAll("student_id").map(String).filter(Boolean);
  if (studentIds.length === 0) throw new Error("Select at least one student");

  const currency = String(formData.get("currency") || "USD");
  const classes_per_week = Number(formData.get("classes_per_week") || 2);
  const billing_mode = String(formData.get("billing_mode") || "monthly") === "per_block" ? "per_block" : "monthly";
  const siblingGroupId = studentIds.length > 1 ? crypto.randomUUID() : null;

  const shared = parseModeFields(billing_mode, formData);

  const { error } = await supabase.from("fee_plans").insert(
    studentIds.map((student_id) => ({
      student_id,
      currency,
      classes_per_week,
      billing_mode,
      sibling_group_id: siblingGroupId,
      ...shared,
    })),
  );
  if (error) throw new Error(error.message);

  await logAudit({
    action: "fee_plan.create",
    entityType: "fee_plan",
    entityId: siblingGroupId,
    entityLabel:
      studentIds.length > 1 ? `${studentIds.length} students (sibling group)` : undefined,
    details:
      billing_mode === "per_block"
        ? `${currency} ${shared.block_amount} per ${shared.classes_per_block} classes, due +${shared.grace_days}d, counting from ${shared.block_billing_since}, ${studentIds.length} plan(s) created by ${profile.full_name}`
        : `${currency} ${shared.monthly_amount}/mo, billing day ${shared.billing_day}, ${studentIds.length} plan(s) created by ${profile.full_name}`,
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
 * Resolves which fee_plans rows an edit/deactivate should touch. A plan
 * created for siblings is one row per student sharing a sibling_group_id
 * (see createFeePlan) -- when `apply_to_siblings` is set we fan the change
 * out to the whole group so admin edits "the sibling plan" once, not N
 * times. Falls back to the single row when the plan isn't in a group.
 */
async function resolveFeePlanTargets(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  feePlanId: string,
  studentId: string,
  applyToSiblings: boolean,
): Promise<{ ids: string[]; studentIds: string[] }> {
  if (!applyToSiblings) return { ids: [feePlanId], studentIds: [studentId] };

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
    .eq("active", true);
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
  const applyToSiblings = formData.get("apply_to_siblings") === "on";

  const { ids, studentIds } = await resolveFeePlanTargets(
    supabase,
    feePlanId,
    studentId,
    applyToSiblings,
  );

  const { error } = await supabase
    .from("fee_plans")
    .update({
      currency: String(formData.get("currency") || "USD"),
      classes_per_week: Number(formData.get("classes_per_week") || 2),
      billing_mode,
      ...shared,
    })
    .in("id", ids);
  if (error) throw new Error(error.message);

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

/** Deactivates rather than deletes so past invoices keep their fee_plan_id reference intact. */
export async function deactivateFeePlan(feePlanId: string, studentId: string, formData?: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const applyToSiblings = formData?.get("apply_to_siblings") === "on";
  const { ids, studentIds } = await resolveFeePlanTargets(
    supabase,
    feePlanId,
    studentId,
    applyToSiblings,
  );

  const { error } = await supabase.from("fee_plans").update({ active: false }).in("id", ids);
  if (error) throw new Error(error.message);

  revalidatePath("/fees");
  for (const sid of studentIds) revalidatePath(`/students/${sid}`);
}
