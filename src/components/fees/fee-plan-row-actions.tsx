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
    monthly_amount: number;
    currency: string;
    billing_day: number;
    classes_per_week: number;
  };
  studentName?: string;
}

export function FeePlanRowActions({ feePlan, studentName }: FeePlanRowActionsProps) {
  const [mode, setMode] = useState<"idle" | "editing" | "confirmingDeactivate">("idle");

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
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-primary-900">
              Edit fee{studentName ? ` — ${studentName}` : ""}
            </h3>
            <form
              action={async (formData) => {
                await boundUpdate(formData);
                toast.success("Fee plan updated");
                setMode("idle");
              }}
              className="mt-4 space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`amount-${feePlan.id}`}>Fee amount</Label>
                  <Input
                    id={`amount-${feePlan.id}`}
                    name="monthly_amount"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={feePlan.monthly_amount}
                  />
                </div>
                <div>
                  <Label htmlFor={`currency-${feePlan.id}`}>Currency</Label>
                  <CurrencySelect id={`currency-${feePlan.id}`} name="currency" defaultValue={feePlan.currency} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`billing_day-${feePlan.id}`}>Fee date (day of month)</Label>
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
                <div>
                  <Label htmlFor={`classes-${feePlan.id}`}>Classes/week</Label>
                  <Select id={`classes-${feePlan.id}`} name="classes_per_week" defaultValue={String(feePlan.classes_per_week)}>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="5">5</option>
                  </Select>
                </div>
              </div>
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
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setMode("idle")}>
                Cancel
              </Button>
              <form
                action={async () => {
                  await boundDeactivate();
                  toast.success("Fee plan deactivated");
                  setMode("idle");
                }}
              >
                <Button type="submit" size="sm" variant="danger">
                  Deactivate
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
