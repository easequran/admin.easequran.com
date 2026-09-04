import { createClient } from "@/lib/supabase/server";
import type { InvoicePdfData } from "@/lib/pdf/invoice-document";

/**
 * Looks up an invoice and, if it belongs to a sibling group, every other
 * invoice from that same group for the same billing period -- so combined
 * PDFs only ever merge siblings' invoices for the SAME month, never
 * unrelated past/future periods.
 */
export async function getInvoicePdfData(invoiceId: string): Promise<InvoicePdfData | null> {
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, students(full_name, guardian_name)")
    .eq("id", invoiceId)
    .single();
  if (!invoice) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: any[] = [invoice];
  if (invoice.sibling_group_id) {
    const { data: siblingInvoices } = await supabase
      .from("invoices")
      .select("*, students(full_name, guardian_name)")
      .eq("sibling_group_id", invoice.sibling_group_id)
      .eq("period_start", invoice.period_start);
    if (siblingInvoices && siblingInvoices.length > 0) {
      rows = [...siblingInvoices].sort((a, b) =>
        (a.students?.full_name ?? "").localeCompare(b.students?.full_name ?? ""),
      );
    }
  }

  const totalAmount = rows.reduce((sum, r) => sum + Number(r.amount), 0);
  const shortId = invoice.id.slice(0, 8).toUpperCase();
  const monthTag = invoice.period_start.slice(0, 7).replace("-", "");

  const guardianNames = Array.from(
    new Set(rows.map((r) => r.students?.guardian_name).filter(Boolean)),
  ) as string[];

  const combinedNotes = Array.from(
    new Set(rows.map((r) => r.notes).filter((n): n is string => Boolean(n && n.trim()))),
  );

  return {
    isCombined: rows.length > 1,
    siblings: rows.map((r) => ({
      studentName: r.students?.full_name ?? "Student",
      amount: Number(r.amount),
    })),
    currency: invoice.currency,
    totalAmount,
    periodStart: invoice.period_start,
    periodEnd: invoice.period_end,
    classesCount: invoice.billing_mode === "per_block" ? invoice.classes_count ?? null : null,
    blockIndex: invoice.billing_mode === "per_block" ? invoice.block_index ?? null : null,
    dueDate: invoice.due_date,
    status: invoice.status,
    invoiceNumber: `INV-${monthTag}-${shortId}`,
    guardianName: guardianNames.join(" / ") || null,
    paymentMethod: invoice.payment_method ?? null,
    notes: combinedNotes.join("\n") || null,
  };
}
