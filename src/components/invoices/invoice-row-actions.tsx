"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { updateInvoice, deleteInvoice } from "@/lib/actions/invoices";
import { toast } from "@/lib/toast";

interface InvoiceRowActionsProps {
  invoice: {
    id: string;
    amount: number;
    currency: string;
    due_date: string;
    status: string;
  };
  studentName?: string;
}

export function InvoiceRowActions({ invoice, studentName }: InvoiceRowActionsProps) {
  const [mode, setMode] = useState<"idle" | "editing" | "confirmingDelete">("idle");

  const boundUpdate = updateInvoice.bind(null, invoice.id);
  const boundDelete = deleteInvoice.bind(null, invoice.id);

  return (
    <div className="flex justify-end gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => setMode("editing")}>
        Edit
      </Button>
      <Button type="button" size="sm" variant="danger" onClick={() => setMode("confirmingDelete")}>
        Delete
      </Button>

      {mode === "editing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-primary-900">
              Edit invoice{studentName ? ` — ${studentName}` : ""}
            </h3>
            <form
              action={async (formData) => {
                await boundUpdate(formData);
                toast.success("Invoice updated");
                setMode("idle");
              }}
              className="mt-4 space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`amount-${invoice.id}`}>Amount</Label>
                  <Input
                    id={`amount-${invoice.id}`}
                    name="amount"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={invoice.amount}
                  />
                </div>
                <div>
                  <Label htmlFor={`currency-${invoice.id}`}>Currency</Label>
                  <Input id={`currency-${invoice.id}`} name="currency" defaultValue={invoice.currency} />
                </div>
              </div>
              <div>
                <Label htmlFor={`due_date-${invoice.id}`}>Due date</Label>
                <Input
                  id={`due_date-${invoice.id}`}
                  name="due_date"
                  type="date"
                  required
                  defaultValue={invoice.due_date}
                />
              </div>
              <div>
                <Label htmlFor={`status-${invoice.id}`}>Status</Label>
                <Select id={`status-${invoice.id}`} name="status" defaultValue={invoice.status}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
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

      {mode === "confirmingDelete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-primary-900">Delete this invoice?</h3>
            <p className="mt-2 text-sm text-slate-500">
              {studentName ? `${studentName}'s invoice` : "This invoice"} for {invoice.currency}{" "}
              {Number(invoice.amount).toFixed(2)} will be permanently removed. This can&apos;t be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setMode("idle")}>
                Cancel
              </Button>
              <form
                action={async () => {
                  await boundDelete();
                  toast.success("Invoice deleted");
                  setMode("idle");
                }}
              >
                <Button type="submit" size="sm" variant="danger">
                  Delete invoice
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
