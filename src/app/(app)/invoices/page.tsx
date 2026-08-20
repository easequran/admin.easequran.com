import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateMonthlyInvoices, markInvoicePaid } from "@/lib/actions/invoices";
import { InvoiceRowActions } from "@/components/invoices/invoice-row-actions";
import { PageHeader } from "@/components/ui/page-header";
import { PrintInvoicesButton } from "@/components/invoices/print-invoices-button";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { CheckCircle2, Clock, AlertTriangle, XCircle, Receipt } from "lucide-react";

const statusTone = {
  pending: "warning",
  paid: "success",
  overdue: "danger",
  cancelled: "neutral",
} as const;

export default async function InvoicesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  let query = supabase
    .from("invoices")
    .select(profile.role === "student" ? "*, students!inner(full_name, profile_id)" : "*, students(full_name)")
    .order("due_date", { ascending: false })
    .limit(50);

  if (profile.role === "student") {
    query = query.eq("students.profile_id", profile.id);
  }

  const { data: invoices } = await query;

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
        title="Invoices & Fees"
        description="Monthly billing across all students."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PrintInvoicesButton />
            {profile.role === "admin" && (
              <form action={generateMonthlyInvoices}>
                <Button type="submit" variant="accent">
                  Generate this month&apos;s invoices
                </Button>
              </form>
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
        description="Most recent 50 billing periods."
        id="invoices-print-area"
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-primary-50 text-left text-xs uppercase text-primary-500">
            <tr>
              <th className="px-5 py-3">Student</th>
              <th className="px-5 py-3">Period</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Due date</th>
              <th className="px-5 py-3">Status</th>
              {profile.role === "admin" && <th className="px-5 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-50">
            {invoices?.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium text-primary-900">
                  {inv.students?.full_name}
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {inv.period_start} → {inv.period_end}
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {inv.currency} {Number(inv.amount).toFixed(2)}
                </td>
                <td className="px-5 py-3 text-slate-600">{inv.due_date}</td>
                <td className="px-5 py-3">
                  <Badge tone={statusTone[inv.status as keyof typeof statusTone]}>{inv.status}</Badge>
                </td>
                {profile.role === "admin" && (
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      {inv.status !== "paid" && (
                        <form action={markInvoicePaid.bind(null, inv.id)}>
                          <Button type="submit" size="sm" variant="outline">
                            Mark paid
                          </Button>
                        </form>
                      )}
                      <InvoiceRowActions invoice={inv} studentName={inv.students?.full_name} />
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {(!invoices || invoices.length === 0) && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </SectionCard>
    </div>
  );
}
