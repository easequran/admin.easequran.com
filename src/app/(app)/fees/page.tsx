import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { CurrencySelect } from "@/components/ui/currency-select";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { createFeePlan } from "@/lib/actions/fees";
import { FeePlanRowActions } from "@/components/fees/fee-plan-row-actions";
import { cn } from "@/lib/utils/cn";
import { Wallet, TrendingUp, AlertCircle } from "lucide-react";

export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student: highlightStudentId } = await searchParams;
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: students }, { data: feePlans }] = await Promise.all([
    // "Confirmed" students -- enrolled and past the trial stage, matching
    // the same filter the weekly-schedule form uses for its student list.
    supabase.from("students").select("id, full_name").eq("enrollment_status", "active").order("full_name"),
    supabase
      .from("fee_plans")
      .select("*, students(full_name)")
      .eq("active", true)
      .order("created_at", { ascending: false }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plans = (feePlans ?? []) as any[];
  const studentIdsWithPlan = new Set(plans.map((p) => p.student_id));
  const studentsWithoutPlan = (students ?? []).filter((s) => !studentIdsWithPlan.has(s.id));

  // Total monthly revenue by currency, since a mixed-currency academy
  // shouldn't get a single misleading combined total.
  const revenueByCurrency = new Map<string, number>();
  for (const p of plans) {
    revenueByCurrency.set(p.currency, (revenueByCurrency.get(p.currency) ?? 0) + Number(p.monthly_amount));
  }
  const totalRevenue =
    revenueByCurrency.size === 0
      ? "0"
      : Array.from(revenueByCurrency.entries())
          .map(([currency, amount]) => `${currency} ${amount.toFixed(2)}`)
          .join(" + ");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees"
        description="Set and manage each confirmed student's monthly fee plan. Actual billing periods are generated on the Invoices page."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active fee plans" value={plans.length} icon={Wallet} tone="info" />
        <StatCard label="Monthly revenue" value={totalRevenue} icon={TrendingUp} tone="success" />
        <StatCard
          label="Students without a plan"
          value={studentsWithoutPlan.length}
          icon={AlertCircle}
          tone={studentsWithoutPlan.length > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Add a fee</CardTitle>
          </CardHeader>
          <CardContent>
            {studentsWithoutPlan.length === 0 ? (
              <p className="text-sm text-slate-500">
                Every confirmed student already has a fee plan. Use Edit below to change one.
              </p>
            ) : (
              <form action={createFeePlan} className="space-y-3">
                <div>
                  <Label htmlFor="student_id">Student</Label>
                  <Select id="student_id" name="student_id" defaultValue={highlightStudentId} required>
                    {studentsWithoutPlan.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="monthly_amount">Fee amount</Label>
                  <Input id="monthly_amount" name="monthly_amount" type="number" step="0.01" required />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <CurrencySelect id="currency" name="currency" />
                </div>
                <div>
                  <Label htmlFor="billing_day">Fee date (day of month)</Label>
                  <Input id="billing_day" name="billing_day" type="number" min={1} max={28} defaultValue={1} required />
                </div>
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
            )}

            {studentsWithoutPlan.length > 0 && (
              <p className="mt-3 text-xs text-slate-400">
                {studentsWithoutPlan.length} confirmed student{studentsWithoutPlan.length === 1 ? "" : "s"} without a
                fee plan yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Active fee plans</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {plans.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No fee plans set yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-primary-50 text-left text-xs uppercase text-primary-500">
                    <tr>
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Fee</th>
                      <th className="px-5 py-3">Fee date</th>
                      <th className="px-5 py-3">Classes/week</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-50">
                    {plans.map((p) => (
                      <tr
                        key={p.id}
                        className={cn("hover:bg-slate-50", p.student_id === highlightStudentId && "bg-accent-100/60")}
                      >
                        <td className="px-5 py-3 font-medium text-primary-900">{p.students?.full_name}</td>
                        <td className="px-5 py-3 text-slate-600">
                          {p.currency} {Number(p.monthly_amount).toFixed(2)} / month
                        </td>
                        <td className="px-5 py-3 text-slate-600">Day {p.billing_day}</td>
                        <td className="px-5 py-3 text-slate-600">{p.classes_per_week}</td>
                        <td className="px-5 py-3">
                          <FeePlanRowActions feePlan={p} studentName={p.students?.full_name} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
