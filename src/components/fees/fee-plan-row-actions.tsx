"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { CurrencySelect } from "@/components/ui/currency-select";
import { updateFeePlan, deactivateFeePlan } from "@/lib/actions/fees";
import { toast } from "@/lib/toast";

interface FeePlanRowActionsProps {
  feePlan: {
    id: string;
    student_id: string;
    monthly_amount: number | null;
    currency: string;
    billing_day: number;
    classes_per_week: number;
    billing_mode: "monthly" | "per_block";
    classes_per_block: number | null;
    block_amount: number | null;
    grace_days: number;
    block_billing_since: string | null;
    sibling_group_id: string | null;
  };
  studentName?: string;
  today: string;
  /** Other students sharing this plan's sibling_group_id (excludes this row's student). */
  siblingNames?: string[];
}

export function FeePlanRowActions({ feePlan, studentName, today, siblingNames = [] }: FeePlanRowActionsProps) {
  const [mode, setMode] = useState<"idle" | "editing" | "confirmingDeactivate">("idle");
  const [billingMode, setBillingMode] = useState<"monthly" | "per_block">(feePlan.billing_mode);
  const inSiblingGroup = Boolean(feePlan.sibling_group_id) && siblingNames.length > 0;
  const siblingGroupSize = siblingNames.length + 1;

  const boundUpdate = updateFeePlan.bind(null, feePlan.id, feePlan.student_id);
  const boundDeactivate = deactivateFeePlan.bind(null, feePlan.id, feePlan.student_id);

  return (
    <div className="flex justify-end gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => setMode("editing")}>
        Edit
      </Button>
      <Button type="button" size="sm" variant="danger" onClick={() => setMode("confirmingDeactivate")}>
        Deactivate
      </Button>

      {mode === "editing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-primary-900">
              Edit fee{studentName ? ` — ${studentName}` : ""}
            </h3>
            <form
              action={async (formData) => {
                try {
                  await boundUpdate(formData);
                  toast.success("Fee plan updated");
                  setMode("idle");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to update fee plan");
                }
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <Label htmlFor={`billing_mode-${feePlan.id}`}>Billing type</Label>
                <Select
                  id={`billing_mode-${feePlan.id}`}
                  name="billing_mode"
                  value={billingMode}
                  onChange={(e) => setBillingMode(e.target.value as "monthly" | "per_block")}
                >
                  <option value="monthly">Monthly (calendar month)</option>
                  <option value="per_block">Fixed fee per set of classes (paid in advance)</option>
                </Select>
              </div>

              <div>
                <Label htmlFor={`currency-${feePlan.id}`}>Currency</Label>
                <CurrencySelect id={`currency-${feePlan.id}`} name="currency" defaultValue={feePlan.currency} />
              </div>

              {billingMode === "monthly" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`amount-${feePlan.id}`}>Fee / month</Label>
                    <Input
                      id={`amount-${feePlan.id}`}
                      name="monthly_amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      defaultValue={feePlan.monthly_amount ?? undefined}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`billing_day-${feePlan.id}`}>Fee date (day)</Label>
                    <Input
                      id={`billing_day-${feePlan.id}`}
                      name="billing_day"
                      type="number"
                      min={1}
                      max={28}
                      required
                      defaultValue={feePlan.billing_day}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`cpb-${feePlan.id}`}>Classes in set</Label>
                      <Input
                        id={`cpb-${feePlan.id}`}
                        name="classes_per_block"
                        type="number"
                        min={1}
                        max={60}
                        required
                        defaultValue={feePlan.classes_per_block ?? 20}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`block_amount-${feePlan.id}`}>Fixed fee / set</Label>
                      <Input
                        id={`block_amount-${feePlan.id}`}
                        name="block_amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        defaultValue={feePlan.block_amount ?? undefined}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`grace-${feePlan.id}`}>Days until due</Label>
                      <Input
                        id={`grace-${feePlan.id}`}
                        name="grace_days"
                        type="number"
                        min={0}
                        max={60}
                        required
                        defaultValue={feePlan.grace_days}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`since-${feePlan.id}`}>Count classes from</Label>
                      <Input
                        id={`since-${feePlan.id}`}
                        name="block_billing_since"
                        type="date"
                        required
                        defaultValue={feePlan.block_billing_since ?? today}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    Fees are collected in advance: switching to this mode raises the first invoice
                    now. Absent classes count toward finishing a set; excused don&apos;t. Moving
                    &quot;count from&quot; earlier can raise catch-up invoices for sets already
                    delivered.
                  </p>
                </>
              )}

              <div>
                <Label htmlFor={`classes-${feePlan.id}`}>Classes/week</Label>
                <Select
                  id={`classes-${feePlan.id}`}
                  name="classes_per_week"
                  defaultValue={String(feePlan.classes_per_week)}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="5">5</option>
                </Select>
              </div>

              {inSiblingGroup && (
                <label className="flex items-start gap-2 rounded-lg bg-accent-50 p-2.5 text-sm text-primary-900">
                  <input
                    type="checkbox"
                    name="apply_to_siblings"
                    defaultChecked
                    className="mt-0.5 h-4 w-4 rounded border-primary-300"
                  />
                  <span>
                    Apply to all {siblingGroupSize} sibling plans
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Also updates {siblingNames.join(", ")}. Uncheck to change only {studentName ?? "this student"}.
                    </span>
                  </span>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setMode("idle")}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Save changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mode === "confirmingDeactivate" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-primary-900">Deactivate this fee plan?</h3>
            <p className="mt-2 text-sm text-slate-500">
              {studentName ? `${studentName}'s fee plan` : "This fee plan"} will stop generating new invoices. Past
              invoices are kept. You can set a new fee plan for this student afterwards.
            </p>
            <form
              action={async (formData) => {
                try {
                  await boundDeactivate(formData);
                  toast.success("Fee plan deactivated");
                  setMode("idle");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to deactivate fee plan");
                }
              }}
            >
              {inSiblingGroup && (
                <label className="mt-3 flex items-start gap-2 rounded-lg bg-accent-50 p-2.5 text-sm text-primary-900">
                  <input
                    type="checkbox"
                    name="apply_to_siblings"
                    defaultChecked
                    className="mt-0.5 h-4 w-4 rounded border-primary-300"
                  />
                  <span>
                    Deactivate all {siblingGroupSize} sibling plans
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Also stops {siblingNames.join(", ")}. Uncheck to deactivate only {studentName ?? "this student"}.
                    </span>
                  </span>
                </label>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setMode("idle")}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="danger">
                  Deactivate
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
