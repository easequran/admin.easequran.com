import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { CurrencySelect } from "@/components/ui/currency-select";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { createFeePlan } from "@/lib/actions/fees";
import { FeePlanRowActions } from "@/components/fees/fee-plan-row-actions";
import { cn } from "@/lib/utils/cn";
import { Wallet, TrendingUp, AlertCircle, PlusCircle, ListChecks } from "lucide-react";
import {
  TABLE_ELEMENT_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_HEAD_CELL_CLASS,
  TABLE_CELL_CLASS,
  TABLE_CELL_SECONDARY_CLASS,
  tableRowClass,
} from "@/lib/utils/table-styles";

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
        icon={Wallet}
        tone="info"
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
        <SectionCard icon={PlusCircle} tone="accent" title="Add a fee" className="lg:col-span-1">
            {studentsWithoutPlan.length === 0 ? (
              <p className="text-sm text-slate-500">
                Every confirmed student already has a fee plan. Use Edit below to change one.
              </p>
            ) : (
              <form action={createFeePlan} className="space-y-3">
                <div>
                  <Label>Student(s)</Label>
                  <p className="mb-1.5 text-xs text-slate-400">
                    Select more than one for siblings -- this permanently links them so their
                    future invoices are always combined into one PDF, even if you edit each
                    plan separately later.
                  </p>
                  <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-primary-200 p-2">
                    {studentsWithoutPlan.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm text-primary-900">
                        <input
                          type="checkbox"
                          name="student_id"
                          value={s.id}
                          defaultChecked={s.id === highlightStudentId}
                          className="h-4 w-4 rounded border-primary-300"
                        />
                        {s.full_name}
                      </label>
                    ))}
                  </div>
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
        </SectionCard>

        <SectionCard icon={ListChecks} tone="success" title="Active fee plans" className="lg:col-span-2" contentClassName="p-0">
            {plans.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No fee plans set yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className={cn(TABLE_ELEMENT_CLASS, "min-w-[640px]")}>
                  <thead className={TABLE_HEAD_CLASS}>
                    <tr>
                      <th className={TABLE_HEAD_CELL_CLASS}>Student</th>
                      <th className={TABLE_HEAD_CELL_CLASS}>Fee</th>
                      <th className={TABLE_HEAD_CELL_CLASS}>Fee date</th>
                      <th className={TABLE_HEAD_CELL_CLASS}>Classes/week</th>
                      <th className={cn(TABLE_HEAD_CELL_CLASS, "text-right")}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p, i) => (
                      <tr
                        key={p.id}
                        className={tableRowClass(i, p.student_id === highlightStudentId ? "!bg-accent-100/60" : undefined)}
                      >
                        <td className={cn(TABLE_CELL_CLASS, "font-medium text-primary-900")}>{p.students?.full_name}</td>
                        <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>
                          {p.currency} {Number(p.monthly_amount).toFixed(2)} / month
                        </td>
                        <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>Day {p.billing_day}</td>
                        <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>{p.classes_per_week}</td>
                        <td className={TABLE_CELL_CLASS}>
                          <FeePlanRowActions feePlan={p} studentName={p.students?.full_name} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </SectionCard>
      </div>
    </div>
  );
}
