"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Modal } from "@/components/ui/modal";
import { ConfirmButton } from "@/components/ui/confirm-button";
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
  };
  studentName?: string;
  today: string;
}

export function FeePlanRowActions({ feePlan, studentName, today }: FeePlanRowActionsProps) {
  const [editing, setEditing] = useState(false);
  const [billingMode, setBillingMode] = useState<"monthly" | "per_block">(feePlan.billing_mode);

  const boundUpdate = updateFeePlan.bind(null, feePlan.id, feePlan.student_id);
  const boundDeactivate = deactivateFeePlan.bind(null, feePlan.id, feePlan.student_id);

  return (
    <div className="flex justify-end gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
        Edit
      </Button>

      <ConfirmButton
        action={boundDeactivate}
        title="Deactivate this fee plan?"
        confirmText="Deactivate"
        confirmingText="Deactivating…"
        successToast="Fee plan deactivated"
        errorToast="Failed to deactivate fee plan"
        body={
          <>
            {studentName ? `${studentName}'s fee plan` : "This fee plan"} will stop generating new
            invoices. Past invoices are kept, and you can set a new fee plan for this student
            afterwards.
          </>
        }
      >
        Deactivate
      </ConfirmButton>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title={`Edit fee${studentName ? ` — ${studentName}` : ""}`}
        size="sm"
      >
        <form
          action={async (formData) => {
            try {
              await boundUpdate(formData);
              toast.success("Fee plan updated");
              setEditing(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to update fee plan");
            }
          }}
          className="space-y-4"
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
              <p className="text-xs text-slate-500">
                Fees are collected in advance: switching to this mode raises the first invoice now.
                Absent classes count toward finishing a set; excused don&apos;t. Moving &quot;count
                from&quot; earlier can raise catch-up invoices for sets already delivered.
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <SubmitButton size="sm" pendingText="Saving…">
              Save changes
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
