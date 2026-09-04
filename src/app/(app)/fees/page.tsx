import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { FeePlanForm } from "@/components/fees/fee-plan-form";
import { FeePlanRowActions } from "@/components/fees/fee-plan-row-actions";
import { cn } from "@/lib/utils/cn";
import { DateTime } from "luxon";
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

  // Advance block billing: how many classes of the currently-paid set have
  // been delivered. When this reaches classes_per_block, the next set's
  // invoice is generated automatically.
  const blockPlans = plans.filter((p) => p.billing_mode === "per_block");
  const progressByPlan = new Map<string, number>();
  if (blockPlans.length > 0) {
    const blockStudentIds = blockPlans.map((p) => p.student_id);
    const { data: occ } = await supabase
      .from("class_occurrences")
      .select("student_id, start_at, attendance(status)")
      .in("student_id", blockStudentIds)
      .in("status", ["completed", "no_show"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (occ ?? []) as any[];
    for (const p of blockPlans) {
      const delivered = rows.filter(
        (r) =>
          r.student_id === p.student_id &&
          r.attendance?.status !== "excused" &&
          (!p.block_billing_since || r.start_at.slice(0, 10) >= p.block_billing_since),
      ).length;
      progressByPlan.set(p.id, p.classes_per_block ? delivered % p.classes_per_block : delivered);
    }
  }

  // Expected revenue per cycle, summed per-currency so a mixed-currency
  // academy doesn't get a single misleading combined total. Monthly plans
  // contribute their monthly fee; block plans contribute one block's price.
  const revenueByCurrency = new Map<string, number>();
  for (const p of plans) {
    const amount = p.billing_mode === "per_block" ? Number(p.block_amount) : Number(p.monthly_amount);
    revenueByCurrency.set(p.currency, (revenueByCurrency.get(p.currency) ?? 0) + (amount || 0));
  }
  const totalRevenue =
    revenueByCurrency.size === 0
      ? "0"
      : Array.from(revenueByCurrency.entries())
          .map(([currency, amount]) => `${currency} ${amount.toFixed(2)}`)
          .join(" + ");

  const today = DateTime.now().toISODate()!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees"
        icon={Wallet}
        tone="info"
        description="Set each confirmed student's fee plan -- a monthly fee, or a fee per block of completed classes. Invoices are generated on the Invoices page."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active fee plans" value={plans.length} icon={Wallet} tone="info" />
        <StatCard label="Expected per cycle" value={totalRevenue} icon={TrendingUp} tone="success" />
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
            <FeePlanForm
              students={studentsWithoutPlan}
              highlightStudentId={highlightStudentId}
              today={today}
            />
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
              <table className={cn(TABLE_ELEMENT_CLASS, "min-w-[680px]")}>
                <thead className={TABLE_HEAD_CLASS}>
                  <tr>
                    <th className={TABLE_HEAD_CELL_CLASS}>Student</th>
                    <th className={TABLE_HEAD_CELL_CLASS}>Fee</th>
                    <th className={TABLE_HEAD_CELL_CLASS}>Billing</th>
                    <th className={TABLE_HEAD_CELL_CLASS}>Classes/week</th>
                    <th className={cn(TABLE_HEAD_CELL_CLASS, "text-right")}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p, i) => {
                    const isBlock = p.billing_mode === "per_block";
                    const progress = progressByPlan.get(p.id) ?? 0;
                    return (
                      <tr
                        key={p.id}
                        className={tableRowClass(i, p.student_id === highlightStudentId ? "!bg-accent-100/60" : undefined)}
                      >
                        <td className={cn(TABLE_CELL_CLASS, "font-medium text-primary-900")}>{p.students?.full_name}</td>
                        <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>
                          {isBlock
                            ? `${p.currency} ${Number(p.block_amount).toFixed(2)} / ${p.classes_per_block} classes`
                            : `${p.currency} ${Number(p.monthly_amount).toFixed(2)} / month`}
                        </td>
                        <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>
                          {isBlock ? (
                            <span>
                              Advance · due +{p.grace_days}d
                              <span className="ml-1 block text-xs text-slate-400">
                                {progress} / {p.classes_per_block} classes into current set
                              </span>
                            </span>
                          ) : (
                            `Monthly · day ${p.billing_day}`
                          )}
                        </td>
                        <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>{p.classes_per_week}</td>
                        <td className={TABLE_CELL_CLASS}>
                          <FeePlanRowActions feePlan={p} studentName={p.students?.full_name} today={today} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
