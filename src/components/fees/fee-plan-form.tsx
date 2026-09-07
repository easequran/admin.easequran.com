"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { CurrencySelect } from "@/components/ui/currency-select";
import { createFeePlan } from "@/lib/actions/fees";

type Student = { id: string; full_name: string };

/**
 * "Add a fee" form. Client component only so the Monthly / Per-class-block
 * toggle can show the right fields without a round-trip.
 */
export function FeePlanForm({
  students,
  highlightStudentId,
  today,
}: {
  students: Student[];
  highlightStudentId?: string;
  today: string;
}) {
  const [mode, setMode] = useState<"monthly" | "per_block">("monthly");
  const [selectedCount, setSelectedCount] = useState(
    students.filter((s) => s.id === highlightStudentId).length,
  );
  const isSiblingGroup = selectedCount > 1;

  return (
    <form action={createFeePlan} className="space-y-3">
      <div>
        <Label>Student(s)</Label>
        <p className="mb-1.5 text-xs text-slate-400">
          Select more than one for siblings -- one plan per student, permanently linked as a sibling
          group: the fee below is the whole family&apos;s and is split evenly between them, they show
          and are edited together, and their invoices combine into one PDF.
        </p>
        <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-primary-200 p-2">
          {students.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm text-primary-900">
              <input
                type="checkbox"
                name="student_id"
                value={s.id}
                defaultChecked={s.id === highlightStudentId}
                onChange={(e) => setSelectedCount((c) => c + (e.target.checked ? 1 : -1))}
                className="h-4 w-4 rounded border-primary-300"
              />
              {s.full_name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="billing_mode">Billing type</Label>
        <Select
          id="billing_mode"
          name="billing_mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as "monthly" | "per_block")}
        >
          <option value="monthly">Monthly (calendar month)</option>
          <option value="per_block">Fixed fee per set of classes (paid in advance)</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="currency">Currency</Label>
        <CurrencySelect id="currency" name="currency" />
      </div>

      {mode === "monthly" ? (
        <>
          <div>
            <Label htmlFor="monthly_amount">
              {isSiblingGroup ? "Total fee / month (whole family)" : "Fee amount / month"}
            </Label>
            <Input id="monthly_amount" name="monthly_amount" type="number" step="0.01" min="0.01" required />
            {isSiblingGroup && (
              <p className="mt-1 text-xs text-slate-400">
                Split evenly across the {selectedCount} selected siblings.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="billing_day">Fee date (day of month)</Label>
            <Input id="billing_day" name="billing_day" type="number" min={1} max={28} defaultValue={1} required />
          </div>
        </>
      ) : (
        <>
          <div>
            <Label htmlFor="classes_per_block">Number of classes in the set</Label>
            <Input
              id="classes_per_block"
              name="classes_per_block"
              type="number"
              min={1}
              max={60}
              defaultValue={20}
              required
            />
            <p className="mt-1 text-xs text-slate-400">
              The first invoice is raised now for this set. The next invoice is generated
              automatically the moment all of them are completed. Absent classes count; excused
              classes don&apos;t.
            </p>
          </div>
          <div>
            <Label htmlFor="block_amount">
              {isSiblingGroup ? "Total fee for the set (whole family)" : "Fixed fee for the set"}
            </Label>
            <Input id="block_amount" name="block_amount" type="number" step="0.01" min="0.01" required />
            {isSiblingGroup && (
              <p className="mt-1 text-xs text-slate-400">
                Split evenly across the {selectedCount} selected siblings.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="grace_days">Days until due (from invoice date)</Label>
            <Input id="grace_days" name="grace_days" type="number" min={0} max={60} defaultValue={3} required />
          </div>
          <div>
            <Label htmlFor="block_billing_since">Count classes from</Label>
            <Input id="block_billing_since" name="block_billing_since" type="date" defaultValue={today} required />
            <p className="mt-1 text-xs text-slate-400">
              Only classes on or after this date count toward finishing the current set. Leave as
              today for a fresh start.
            </p>
          </div>
        </>
      )}

      <div>
        <Label htmlFor="classes_per_week">Classes/week</Label>
        <Select id="classes_per_week" name="classes_per_week" defaultValue="2">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="5">5</option>
        </Select>
      </div>

      <Button type="submit" className="w-full">
        Save fee
      </Button>
    </form>
  );
}
