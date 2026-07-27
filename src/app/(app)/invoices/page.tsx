import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateMonthlyInvoices, markInvoicePaid, markOverdueInvoices } from "@/lib/actions/invoices";

const statusTone = {
  pending: "warning",
  paid: "success",
  overdue: "danger",
  cancelled: "neutral",
} as const;

export default async function InvoicesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  await markOverdueInvoices();

  let query = supabase
    .from("invoices")
    .select("*, students(full_name)")
    .order("due_date", { ascending: false })
    .limit(50);

  if (profile.role === "student") {
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", profile.id)
      .single();
    query = query.eq("student_id", student?.id ?? "");
  }

  const { data: invoices } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary-900">Invoices & Fees</h1>
        {profile.role === "admin" && (
          <form action={generateMonthlyInvoices}>
            <Button type="submit" variant="accent">
              Generate this month&apos;s invoices
            </Button>
          </form>
        )}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary-50 text-left text-xs uppercase text-primary-500">
            <tr>
              <th className="px-5 py-3">Student</th>
              <th className="px-5 py-3">Period</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Due date</th>
              <th className="px-5 py-3">Status</th>
              {profile.role === "admin" && <th className="px-5 py-3" />}
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
                    {inv.status !== "paid" && (
                      <form action={markInvoicePaid.bind(null, inv.id)}>
                        <Button type="submit" size="sm" variant="outline">
                          Mark paid
                        </Button>
                      </form>
                    )}
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
      </Card>
    </div>
  );
}
