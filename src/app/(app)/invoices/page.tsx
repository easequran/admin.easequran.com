import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { generateMonthlyInvoices, markInvoicePaid, syncClassBlockInvoices } from "@/lib/actions/invoices";
import { InvoiceRowActions } from "@/components/invoices/invoice-row-actions";
import { PageHeader } from "@/components/ui/page-header";
import { PrintInvoicesButton } from "@/components/invoices/print-invoices-button";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { Pagination } from "@/components/ui/pagination";
import { parsePageParam, pageRange, pageCount } from "@/lib/utils/pagination";
import { formatDate, formatDateRange } from "@/lib/utils/format";
import { CheckCircle2, Clock, AlertTriangle, XCircle, Receipt } from "lucide-react";
import {
  TABLE_ELEMENT_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_HEAD_CELL_CLASS,
  TABLE_CELL_CLASS,
  TABLE_CELL_SECONDARY_CLASS,
  tableRowClass,
} from "@/lib/utils/table-styles";
import { cn } from "@/lib/utils/cn";

const INVOICES_PER_PAGE = 50;
import { INVOICE_STATUS_TONE } from "@/lib/utils/invoice-status";

const statusTone = INVOICE_STATUS_TONE;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);
  const { from, to } = pageRange(page, INVOICES_PER_PAGE);

  let query = supabase
    .from("invoices")
    .select(
      profile.role === "student" ? "*, students!inner(full_name, profile_id)" : "*, students(full_name)",
      { count: "exact" },
    )
    .order("due_date", { ascending: false })
    .range(from, to);

  if (profile.role === "student") {
    query = query.eq("students.profile_id", profile.id);
  }

  const { data: invoices, count } = await query;
  const totalPages = pageCount(count ?? 0, INVOICES_PER_PAGE);

  // Totals by status, in whichever currency dominates the list -- summed
  // per-currency so a mixed-currency academy doesn't get a misleading total.
  const totalsByStatus = new Map<string, Map<string, number>>();
  for (const inv of invoices ?? []) {
    const byCurrency = totalsByStatus.get(inv.status) ?? new Map<string, number>();
    byCurrency.set(inv.currency, (byCurrency.get(inv.currency) ?? 0) + Number(inv.amount));
    totalsByStatus.set(inv.status, byCurrency);
  }
  function formatTotal(status: string) {
    const byCurrency = totalsByStatus.get(status);
    if (!byCurrency || byCurrency.size === 0) return "0";
    return Array.from(byCurrency.entries())
      .map(([currency, amount]) => `${currency} ${amount.toFixed(2)}`)
      .join(" + ");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        icon={Receipt}
        tone="info"
        description="Monthly fees and per-class-block invoices across all students."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PrintInvoicesButton />
            {profile.role === "admin" && (
              <>
                <form action={syncClassBlockInvoices}>
                  <SubmitButton variant="outline" pendingText="Syncing…">
                    Sync class-block invoices
                  </SubmitButton>
                </form>
                <form action={generateMonthlyInvoices}>
                  <SubmitButton variant="accent" pendingText="Generating…">
                    Generate this month&apos;s invoices
                  </SubmitButton>
                </form>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Paid" value={formatTotal("paid")} icon={CheckCircle2} tone="success" />
        <StatCard label="Pending" value={formatTotal("pending")} icon={Clock} tone="warning" />
        <StatCard label="Overdue" value={formatTotal("overdue")} icon={AlertTriangle} tone="danger" />
        <StatCard label="Cancelled" value={formatTotal("cancelled")} icon={XCircle} tone="neutral" />
      </div>

      <SectionCard
        icon={Receipt}
        tone="info"
        title="All invoices"
        description="Sorted by due date, newest first."
        id="invoices-print-area"
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
        <table className={cn(TABLE_ELEMENT_CLASS, "min-w-[720px]")}>
          <thead className={TABLE_HEAD_CLASS}>
            <tr>
              <th className={TABLE_HEAD_CELL_CLASS}>Student</th>
              <th className={TABLE_HEAD_CELL_CLASS}>Period</th>
              <th className={TABLE_HEAD_CELL_CLASS}>Amount</th>
              <th className={TABLE_HEAD_CELL_CLASS}>Due date</th>
              <th className={TABLE_HEAD_CELL_CLASS}>Status</th>
              {profile.role === "admin" && <th className={cn(TABLE_HEAD_CELL_CLASS, "text-right")}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {invoices?.map((inv, i) => (
              <tr key={inv.id} className={tableRowClass(i)}>
                <td className={cn(TABLE_CELL_CLASS, "font-medium text-primary-900")}>
                  {inv.students?.full_name}
                </td>
                <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>
                  {inv.billing_mode === "per_block"
                    ? `${inv.block_index ? `Set ${inv.block_index}` : "Set"} · ${inv.classes_count ?? ""} classes (advance)`
                    : formatDateRange(inv.period_start, inv.period_end)}
                </td>
                <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>
                  {inv.currency} {Number(inv.amount).toFixed(2)}
                </td>
                <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>{formatDate(inv.due_date)}</td>
                <td className={TABLE_CELL_CLASS}>
                  <Badge tone={statusTone[inv.status as keyof typeof statusTone]}>{inv.status}</Badge>
                </td>
                {profile.role === "admin" && (
                  <td className={TABLE_CELL_CLASS}>
                    <div className="flex justify-end gap-2">
                      {inv.status !== "paid" && (
                        <form action={markInvoicePaid.bind(null, inv.id)}>
                          <SubmitButton size="sm" variant="outline" pendingText="Marking…">
                            Mark paid
                          </SubmitButton>
                        </form>
                      )}
                      <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer">
                        <Button type="button" size="sm" variant="outline">
                          PDF
                        </Button>
                      </a>
                      <InvoiceRowActions invoice={inv} studentName={inv.students?.full_name} />
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {(!invoices || invoices.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  {page > 1 ? "No more invoices." : "No invoices yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </SectionCard>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={count ?? undefined}
        basePath="/invoices"
        itemLabel="invoices"
      />
    </div>
  );
}
