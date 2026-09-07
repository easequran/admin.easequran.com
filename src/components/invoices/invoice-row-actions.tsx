"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Modal } from "@/components/ui/modal";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { updateInvoice, deleteInvoice } from "@/lib/actions/invoices";
import { toast } from "@/lib/toast";

interface InvoiceRowActionsProps {
  invoice: {
    id: string;
    amount: number;
    currency: string;
    due_date: string;
    status: string;
    notes?: string | null;
  };
  studentName?: string;
}

export function InvoiceRowActions({ invoice, studentName }: InvoiceRowActionsProps) {
  const [editing, setEditing] = useState(false);

  const boundUpdate = updateInvoice.bind(null, invoice.id);
  const boundDelete = deleteInvoice.bind(null, invoice.id);

  return (
    <div className="flex justify-end gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
        Edit
      </Button>

      <ConfirmButton
        action={boundDelete}
        title="Delete this invoice?"
        confirmText="Delete invoice"
        confirmingText="Deleting…"
        successToast="Invoice deleted"
        errorToast="Failed to delete invoice"
        body={
          <>
            {studentName ? `${studentName}'s invoice` : "This invoice"} for {invoice.currency}{" "}
            {Number(invoice.amount).toFixed(2)} will be permanently removed. This can&apos;t be undone.
          </>
        }
      >
        Delete
      </ConfirmButton>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title={`Edit invoice${studentName ? ` — ${studentName}` : ""}`}
        size="sm"
      >
        <form
          action={async (formData) => {
            try {
              await boundUpdate(formData);
              toast.success("Invoice updated");
              setEditing(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to update invoice");
            }
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`amount-${invoice.id}`}>Amount</Label>
              <Input
                id={`amount-${invoice.id}`}
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
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
          <div>
            <Label htmlFor={`notes-${invoice.id}`}>Notes / instructions</Label>
            <Textarea
              id={`notes-${invoice.id}`}
              name="notes"
              rows={3}
              placeholder="Shown on the PDF -- e.g. this month's payment link, bank details, or any instructions."
              defaultValue={invoice.notes ?? ""}
            />
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
