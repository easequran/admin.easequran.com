import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { StudentForm } from "@/components/students/student-form";
import { updateStudent, deleteStudent, addStudentSchedule, removeStudentSchedule } from "@/lib/actions/students";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WeeklyScheduleFields } from "@/components/students/weekly-schedule-fields";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { User, BarChart3, CalendarClock, Wallet, Receipt } from "lucide-react";
import { INVOICE_STATUS_TONE } from "@/lib/utils/invoice-status";

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { id } = await params;
  const { month: monthParam } = await searchParams;
  await requireAdmin();
  const supabase = await createClient();

  const selectedMonth = monthParam && /^\d{4}-\d{2}$/.test(monthParam)
    ? DateTime.fromFormat(monthParam, "yyyy-LL")
    : DateTime.now();
  const monthStart = selectedMonth.startOf("month");
  const monthEnd = selectedMonth.endOf("month");

  const [{ data: student }, { data: schedules }, { data: invoices }, { data: feePlans }, { data: monthClasses }, { data: teachers }] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).single(),
    supabase.from("recurring_schedules").select("*, teachers(profiles(full_name))").eq("student_id", id).eq("active", true),
    supabase.from("invoices").select("*").eq("student_id", id).order("due_date", { ascending: false }),
    supabase.from("fee_plans").select("*").eq("student_id", id).order("created_at", { ascending: false }),
    supabase
      .from("class_occurrences")
      .select("id, start_at, status, teachers(profiles(full_name)), attendance(status, notes)")
      .eq("student_id", id)
      .gte("start_at", monthStart.toUTC().toISO()!)
      .lte("start_at", monthEnd.toUTC().toISO()!)
      .order("start_at"),
    supabase.from("teachers").select("id, hourly_rate, currency, profiles(full_name)").eq("active", true),
  ]);
  if (!student) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teacherOptions = ((teachers ?? []) as any[]).map((t) => ({
    id: t.id,
    name: t.profiles?.full_name ?? "Unnamed",
    hourlyRate: t.hourly_rate,
    currency: t.currency,
  }));

  // `attendance.occurrence_id` is unique, so PostgREST embeds it as a
  // single object rather than an array -- indexing with [0] here always
  // silently returned undefined.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const classesThisMonth = (monthClasses ?? []) as any[];
  const marked = classesThisMonth.filter((c) => c.attendance?.status);
  const presentCount = marked.filter((c) => ["present", "late"].includes(c.attendance.status)).length;
  const absentCount = marked.filter((c) => c.attendance.status === "absent").length;
  const excusedCount = marked.filter((c) => c.attendance.status === "excused").length;
  const attendanceRate = marked.length > 0 ? Math.round((presentCount / marked.length) * 100) : null;
  const comments = classesThisMonth.filter((c) => c.attendance?.notes);

  const allFeePlans = feePlans ?? [];
  const activeFeePlan = allFeePlans.find((p) => p.active);
  const pastFeePlans = allFeePlans.filter((p) => p.id !== activeFeePlan?.id);
  const allInvoices = invoices ?? [];

  // For a per_block plan, how many billable classes are already banked toward
  // the next auto-invoice (absent counts, excused doesn't, only since the
  // plan's "count from" date, and only classes not already on an invoice).
  let blockProgress: { done: number; per: number; remaining: number } | null = null;
  if (activeFeePlan?.billing_mode === "per_block" && activeFeePlan.classes_per_block) {
    const [{ data: occ }, { data: invoiced }] = await Promise.all([
      supabase
        .from("class_occurrences")
        .select("id, start_at, attendance(status)")
        .eq("student_id", id)
        .in("status", ["completed", "no_show"]),
      supabase.from("invoice_class_occurrences").select("occurrence_id"),
    ]);
    const invoicedIds = new Set((invoiced ?? []).map((r) => r.occurrence_id));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const billable = ((occ ?? []) as any[]).filter(
      (r) =>
        !invoicedIds.has(r.id) &&
        r.attendance?.status !== "excused" &&
        (!activeFeePlan.block_billing_since || r.start_at.slice(0, 10) >= activeFeePlan.block_billing_since),
    ).length;
    const per = activeFeePlan.classes_per_block as number;
    const done = billable % per;
    blockProgress = { done, per, remaining: per - done };
  }

  const prevMonth = selectedMonth.minus({ months: 1 }).toFormat("yyyy-LL");
  const nextMonth = selectedMonth.plus({ months: 1 }).toFormat("yyyy-LL");

  const boundUpdate = updateStudent.bind(null, id);
  const boundDelete = deleteStudent.bind(null, id);
  const boundAddSchedule = addStudentSchedule.bind(null, id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={student.full_name}
        icon={User}
        tone="info"
        backHref="/students"
        backLabel="Back to Students"
        actions={
          <form action={boundDelete}>
            <Button type="submit" variant="danger" size="sm">
              Delete student
            </Button>
          </form>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard icon={User} tone="info" title="Profile">
            <StudentForm student={student} action={boundUpdate} />
          </SectionCard>

          <SectionCard
            icon={BarChart3}
            tone="accent"
            title={`Monthly progress report — ${selectedMonth.toFormat("MMMM yyyy")}`}
            actions={
              <div className="flex gap-2">
                <a
                  href={`?month=${prevMonth}`}
                  className="rounded-md border border-primary-200 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50"
                >
                  ← Prev
                </a>
                <a
                  href={`?month=${nextMonth}`}
                  className="rounded-md border border-primary-200 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50"
                >
                  Next →
                </a>
              </div>
            }
          >
              {classesThisMonth.length === 0 ? (
                <p className="text-sm text-slate-500">No classes scheduled this month.</p>
              ) : (
                <>
                  <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg bg-primary-50 px-3 py-2 text-center">
                      <p className="text-lg font-semibold text-primary-900">{classesThisMonth.length}</p>
                      <p className="text-xs text-slate-500">Total classes</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center">
                      <p className="text-lg font-semibold text-emerald-700">{presentCount}</p>
                      <p className="text-xs text-slate-500">Present</p>
                    </div>
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-center">
                      <p className="text-lg font-semibold text-red-700">{absentCount}</p>
                      <p className="text-xs text-slate-500">Absent</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-center">
                      <p className="text-lg font-semibold text-amber-700">
                        {attendanceRate !== null ? `${attendanceRate}%` : "—"}
                      </p>
                      <p className="text-xs text-slate-500">Attendance rate</p>
                    </div>
                  </div>

                  {excusedCount > 0 && (
                    <p className="mb-4 text-xs text-slate-500">{excusedCount} excused absence(s) not counted against attendance rate.</p>
                  )}

                  <p className="mb-2 text-sm font-medium text-primary-900">Teacher comments this month</p>
                  {comments.length === 0 ? (
                    <p className="text-sm text-slate-500">No comments logged yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {comments.map((c) => (
                        <li key={c.id} className="rounded-lg bg-primary-50 px-3 py-2 text-sm">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>{DateTime.fromISO(c.start_at).toFormat("MMM d")}</span>
                            <span>·</span>
                            <span>{c.teachers?.profiles?.full_name ?? "Teacher"}</span>
                            <Badge tone={c.attendance.status === "present" ? "success" : c.attendance.status === "absent" ? "danger" : "warning"}>
                              {c.attendance.status}
                            </Badge>
                          </div>
                          <p className="mt-1 text-primary-800">{c.attendance.notes}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard icon={CalendarClock} tone="success" title="Weekly schedule">
              {!schedules || schedules.length === 0 ? (
                <p className="mb-4 text-sm text-slate-500">No recurring classes yet.</p>
              ) : (
                <ul className="mb-4 space-y-2 text-sm">
                  {schedules.map((s) => {
                    const boundRemove = removeStudentSchedule.bind(null, s.id, id);
                    return (
                      <li key={s.id} className="flex items-start justify-between gap-2 rounded-lg bg-primary-50 px-3 py-2">
                        <div>
                          <p className="font-medium text-primary-900">
                            {s.teachers?.profiles?.full_name}
                          </p>
                          <p className="text-slate-500">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][s.day_of_week]}{" "}
                            {s.local_start_time} ({s.timezone}) · {s.duration_minutes}m
                          </p>
                        </div>
                        <form action={boundRemove}>
                          <Button type="submit" variant="danger" size="sm">
                            Remove
                          </Button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}

              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-primary-700 hover:text-primary-900">
                  + Assign teacher / add a class
                </summary>
                <form action={boundAddSchedule} className="mt-3 space-y-3">
                  <WeeklyScheduleFields teachers={teacherOptions} />
                  <Button type="submit" size="sm">
                    Add to schedule
                  </Button>
                </form>
              </details>
          </SectionCard>

          <SectionCard icon={Wallet} tone="warning" title="Fee plan">
              {activeFeePlan ? (
                activeFeePlan.billing_mode === "per_block" ? (
                  <div className="mb-3 text-sm text-primary-900">
                    <p>
                      {activeFeePlan.currency} {Number(activeFeePlan.block_amount).toFixed(2)} every{" "}
                      {activeFeePlan.classes_per_block} classes · due {activeFeePlan.grace_days} day
                      {activeFeePlan.grace_days === 1 ? "" : "s"} after the last class ·{" "}
                      {activeFeePlan.classes_per_week} classes/week
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Counting classes since{" "}
                      {DateTime.fromISO(activeFeePlan.block_billing_since).toFormat("d MMM yyyy")}
                      {blockProgress
                        ? ` · ${blockProgress.done}/${blockProgress.per} banked, ${blockProgress.remaining} more class${
                            blockProgress.remaining === 1 ? "" : "es"
                          } until the next invoice`
                        : ""}
                    </p>
                  </div>
                ) : (
                  <p className="mb-3 text-sm text-primary-900">
                    {activeFeePlan.currency} {Number(activeFeePlan.monthly_amount).toFixed(2)} / month · billed on day{" "}
                    {activeFeePlan.billing_day} · {activeFeePlan.classes_per_week} classes/week
                  </p>
                )
              ) : (
                <p className="mb-3 text-sm text-slate-500">No active fee plan set.</p>
              )}
              <Link
                href={`/fees?student=${id}`}
                className="text-sm font-medium text-primary-700 hover:text-primary-900"
              >
                {activeFeePlan ? "Manage fee plan →" : "Add a fee plan →"}
              </Link>

              {pastFeePlans.length > 0 && (
                <details className="group mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-primary-700 hover:text-primary-900">
                    + {pastFeePlans.length} past fee plan{pastFeePlans.length > 1 ? "s" : ""}
                  </summary>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {pastFeePlans.map((p) => (
                      <li key={p.id} className="flex items-center justify-between rounded-lg bg-primary-50 px-3 py-2">
                        <span className="text-primary-800">
                          {p.billing_mode === "per_block"
                            ? `${p.currency} ${Number(p.block_amount).toFixed(2)} / ${p.classes_per_block} classes`
                            : `${p.currency} ${Number(p.monthly_amount).toFixed(2)} / month · day ${p.billing_day}`}{" "}
                          · {DateTime.fromISO(p.created_at).toFormat("MMM yyyy")}
                        </span>
                        {!p.active && <Badge tone="neutral">inactive</Badge>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
          </SectionCard>

          <SectionCard icon={Receipt} tone="neutral" title="Invoice & payment history">
              {allInvoices.length === 0 ? (
                <p className="text-sm text-slate-500">No invoices yet.</p>
              ) : (
                <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
                  {allInvoices.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between gap-2 rounded-lg bg-primary-50 px-3 py-2">
                      <div>
                        <p className="text-primary-900">
                          {inv.currency} {Number(inv.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Due {DateTime.fromISO(inv.due_date).toFormat("d MMM yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={INVOICE_STATUS_TONE[inv.status as keyof typeof INVOICE_STATUS_TONE]}>
                          {inv.status}
                        </Badge>
                        <a
                          href={`/api/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-primary-700 hover:underline"
                        >
                          PDF
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
