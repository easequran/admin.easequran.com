import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateMonthlyInvoices, markInvoicePaid } from "@/lib/actions/invoices";
import { InvoiceRowActions } from "@/components/invoices/invoice-row-actions";
import { PageHeader } from "@/components/ui/page-header";

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices & Fees"
        description="Monthly billing across all students."
        actions={
          profile.role === "admin" ? (
            <form action={generateMonthlyInvoices}>
              <Button type="submit" variant="accent">
                Generate this month&apos;s invoices
              </Button>
            </form>
          ) : undefined
        }
      />

      <Card className="overflow-hidden">
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
      </Card>
    </div>
  );
}
