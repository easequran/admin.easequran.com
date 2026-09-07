import { requireAdmin } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { addIncome, addExpense, addDraw, deleteFinanceEntry } from "@/lib/actions/finance";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import {
  TABLE_ELEMENT_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_HEAD_CELL_CLASS,
  TABLE_CELL_CLASS,
  TABLE_CELL_SECONDARY_CLASS,
  tableRowClass,
} from "@/lib/utils/table-styles";
import { cn } from "@/lib/utils/cn";
import { MonthPicker } from "@/components/finance/month-picker";
import { DateTime } from "luxon";
import { EmptyState } from "@/components/ui/empty-state";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Landmark, Inbox } from "lucide-react";

const PARTNER_LABEL: Record<string, string> = { umair: "Muhammad Umair", shah_zaib: "Shah Zaib" };

function pkr(amount: number) {
  return `Rs ${amount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; month?: string; showAll?: string }>;
}) {
  await requireAdmin();
  const { error, month, showAll } = await searchParams;
  const supabase = await createClient();

  const [{ data: income }, { data: expenses }, { data: draws }] = await Promise.all([
    supabase.from("finance_income").select("*").order("occurred_on", { ascending: false }),
    supabase.from("finance_expenses").select("*").order("occurred_on", { ascending: false }),
    supabase.from("finance_draws").select("*").order("occurred_on", { ascending: false }),
  ]);

  const allIncome = income ?? [];
  const allExpenses = expenses ?? [];
  const allDraws = draws ?? [];

  const sum = (rows: { amount: number }[]) => rows.reduce((s, r) => s + Number(r.amount), 0);

  const totalIncomeAllTime = sum(allIncome);
  const totalExpensesAllTime = sum(allExpenses);
  const totalDrawsAllTime = sum(allDraws);
  const currentBalance = totalIncomeAllTime - totalExpensesAllTime - totalDrawsAllTime;

  const monthStart = month ? DateTime.fromFormat(month, "yyyy-LL").startOf("month") : DateTime.now().startOf("month");
  const monthEnd = monthStart.endOf("month");
  const inSelectedMonth = (occurredOn: string) => {
    const d = DateTime.fromISO(occurredOn);
    return d >= monthStart && d <= monthEnd;
  };

  const allTime = !!showAll;

  const displayIncome = allTime ? allIncome : allIncome.filter((r) => inSelectedMonth(r.occurred_on));
  const displayExpenses = allTime ? allExpenses : allExpenses.filter((r) => inSelectedMonth(r.occurred_on));
  const displayDraws = allTime ? allDraws : allDraws.filter((r) => inSelectedMonth(r.occurred_on));

  const scopeShort = allTime ? "all time" : monthStart.toFormat("LLL yyyy");
  const scopeLong = allTime ? "all time" : monthStart.toFormat("LLLL yyyy");

  const scopedIncome = sum(displayIncome);
  const scopedExpenses = sum(displayExpenses);
  const scopedNetProfit = scopedIncome - scopedExpenses;
  const scopedProfitShare = scopedNetProfit / 2;

  const scopedDrawsByPartner: Record<string, number> = { umair: 0, shah_zaib: 0 };
  for (const d of displayDraws) {
    scopedDrawsByPartner[d.partner] = (scopedDrawsByPartner[d.partner] ?? 0) + Number(d.amount);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        icon={Landmark}
        tone="accent"
        description="Partner finances, separate from student billing -- all figures in PKR."
        actions={<MonthPicker month={monthStart.toFormat("yyyy-LL")} allTime={allTime} />}
      />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Current balance (all-time)" value={pkr(currentBalance)} icon={Wallet} tone="accent" />
        <StatCard label={`Income -- ${scopeShort}`} value={pkr(scopedIncome)} icon={TrendingUp} tone="success" />
        <StatCard label={`Expenses -- ${scopeShort}`} value={pkr(scopedExpenses)} icon={TrendingDown} tone="danger" />
        <StatCard label={`Net profit -- ${scopeShort}`} value={pkr(scopedNetProfit)} icon={PiggyBank} tone="info" />
      </div>

      <SectionCard icon={PiggyBank} tone="accent" title={`Profit split -- ${scopeLong}`}>
        <div className="overflow-x-auto rounded-lg">
          <table className={cn(TABLE_ELEMENT_CLASS, "min-w-[480px]")}>
            <thead className={TABLE_HEAD_CLASS}>
              <tr>
                <th className={TABLE_HEAD_CELL_CLASS}>Partner</th>
                <th className={TABLE_HEAD_CELL_CLASS}>Profit share (50%)</th>
                <th className={TABLE_HEAD_CELL_CLASS}>Already drawn</th>
                <th className={TABLE_HEAD_CELL_CLASS}>Remaining owed</th>
              </tr>
            </thead>
            <tbody>
              {(["umair", "shah_zaib"] as const).map((partner, i) => {
                const drawn = scopedDrawsByPartner[partner] ?? 0;
                const remaining = scopedProfitShare - drawn;
                return (
                  <tr key={partner} className={tableRowClass(i)}>
                    <td className={cn(TABLE_CELL_CLASS, "font-medium text-primary-900")}>{PARTNER_LABEL[partner]}</td>
                    <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>{pkr(scopedProfitShare)}</td>
                    <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>{pkr(drawn)}</td>
                    <td
                      className={cn(
                        TABLE_CELL_CLASS,
                        "font-medium",
                        remaining >= 0 ? "text-emerald-700" : "text-red-600",
                      )}
                    >
                      {pkr(remaining)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard icon={TrendingUp} tone="success" title="Add income">
          <form action={addIncome} className="space-y-4">
            <div>
              <Label htmlFor="income_amount">Amount (PKR)</Label>
              <Input id="income_amount" name="amount" type="number" step="0.01" min="0.01" required />
            </div>
            <div>
              <Label htmlFor="income_date">Date received</Label>
              <Input
                id="income_date"
                name="occurred_on"
                type="date"
                defaultValue={DateTime.now().toISODate()!}
                required
              />
            </div>
            <div>
              <Label htmlFor="income_note">Note</Label>
              <Textarea id="income_note" name="note" rows={2} placeholder="e.g. Fee -- student name" />
            </div>
            <SubmitButton pendingText="Adding...">Add income</SubmitButton>
          </form>
        </SectionCard>

        <SectionCard icon={TrendingDown} tone="danger" title="Add expense">
          <form action={addExpense} className="space-y-4">
            <div>
              <Label htmlFor="expense_amount">Amount (PKR)</Label>
              <Input id="expense_amount" name="amount" type="number" step="0.01" min="0.01" required />
            </div>
            <div>
              <Label htmlFor="expense_date">Date</Label>
              <Input
                id="expense_date"
                name="occurred_on"
                type="date"
                defaultValue={DateTime.now().toISODate()!}
                required
              />
            </div>
            <div>
              <Label htmlFor="expense_category">Category</Label>
              <Input id="expense_category" name="category" placeholder="e.g. Software, Marketing" required />
            </div>
            <div>
              <Label htmlFor="expense_paid_by">Paid by</Label>
              <Select id="expense_paid_by" name="paid_by" required>
                <option value="umair">Muhammad Umair</option>
                <option value="shah_zaib">Shah Zaib</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="expense_note">Note</Label>
              <Textarea id="expense_note" name="note" rows={2} />
            </div>
            <SubmitButton variant="danger" pendingText="Adding...">
              Add expense
            </SubmitButton>
          </form>
        </SectionCard>
      </div>

      <SectionCard icon={PiggyBank} tone="info" title="Record a partner draw">
        <form action={addDraw} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div>
            <Label htmlFor="draw_partner">Partner</Label>
            <Select id="draw_partner" name="partner" required>
              <option value="umair">Muhammad Umair</option>
              <option value="shah_zaib">Shah Zaib</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="draw_amount">Amount (PKR)</Label>
            <Input id="draw_amount" name="amount" type="number" step="0.01" min="0.01" required />
          </div>
          <div>
            <Label htmlFor="draw_date">Date</Label>
            <Input id="draw_date" name="occurred_on" type="date" defaultValue={DateTime.now().toISODate()!} required />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <Label htmlFor="draw_note">Note</Label>
            <Input id="draw_note" name="note" placeholder="Optional" />
          </div>
          <SubmitButton pendingText="Recording...">Record draw</SubmitButton>
        </form>
      </SectionCard>

      <SectionCard icon={TrendingUp} tone="success" title={`Income log -- ${scopeLong}`}>
        <FinanceTable
          rows={displayIncome}
          table="finance_income"
          columns={["Date", "Amount", "Note"]}
          renderRow={(r) => [DateTime.fromISO(r.occurred_on).toFormat("d LLL yyyy"), pkr(Number(r.amount)), r.note ?? "—"]}
        />
      </SectionCard>

      <SectionCard icon={TrendingDown} tone="danger" title={`Expense log -- ${scopeLong}`}>
        <FinanceTable
          rows={displayExpenses}
          table="finance_expenses"
          columns={["Date", "Amount", "Category", "Paid by", "Note"]}
          renderRow={(r) => [
            DateTime.fromISO(r.occurred_on).toFormat("d LLL yyyy"),
            pkr(Number(r.amount)),
            r.category,
            PARTNER_LABEL[r.paid_by] ?? r.paid_by,
            r.note ?? "—",
          ]}
        />
      </SectionCard>

      <SectionCard icon={PiggyBank} tone="info" title={`Partner draws log -- ${scopeLong}`}>
        <FinanceTable
          rows={displayDraws}
          table="finance_draws"
          columns={["Date", "Partner", "Amount", "Note"]}
          renderRow={(r) => [
            DateTime.fromISO(r.occurred_on).toFormat("d LLL yyyy"),
            PARTNER_LABEL[r.partner] ?? r.partner,
            pkr(Number(r.amount)),
            r.note ?? "—",
          ]}
        />
      </SectionCard>
    </div>
  );
}

function FinanceTable({
  rows,
  table,
  columns,
  renderRow,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[];
  table: "finance_income" | "finance_expenses" | "finance_draws";
  columns: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderRow: (row: any) => string[];
}) {
  if (rows.length === 0) return <EmptyState compact icon={Inbox} title="No entries yet" />;

  return (
    <div className="overflow-x-auto rounded-lg">
      <table className={cn(TABLE_ELEMENT_CLASS, "min-w-[560px]")}>
        <thead className={TABLE_HEAD_CLASS}>
          <tr>
            {columns.map((c) => (
              <th key={c} className={TABLE_HEAD_CELL_CLASS}>
                {c}
              </th>
            ))}
            <th className={TABLE_HEAD_CELL_CLASS}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className={tableRowClass(i)}>
              {renderRow(row).map((cell, j) => (
                <td key={j} className={cn(TABLE_CELL_CLASS, j === 0 ? "font-medium text-primary-900" : TABLE_CELL_SECONDARY_CLASS)}>
                  {cell}
                </td>
              ))}
              <td className={TABLE_CELL_CLASS}>
                <ConfirmButton
                  action={deleteFinanceEntry.bind(null, table, row.id)}
                  title="Delete this entry?"
                  confirmText="Delete"
                  confirmingText="Deleting…"
                  errorToast="Failed to delete entry"
                  body="This entry is removed and the balance, net profit and partner profit-split figures recalculate. This can't be undone."
                >
                  Delete
                </ConfirmButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
