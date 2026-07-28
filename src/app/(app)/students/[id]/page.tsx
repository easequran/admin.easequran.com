import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { StudentForm } from "@/components/students/student-form";
import { updateStudent, deleteStudent } from "@/lib/actions/students";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createFeePlan } from "@/lib/actions/invoices";
import { PageHeader } from "@/components/ui/page-header";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";

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

  const [{ data: student }, { data: schedules }, { data: invoices }, { data: feePlan }, { data: monthClasses }] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).single(),
    supabase.from("recurring_schedules").select("*, teachers(profiles(full_name))").eq("student_id", id).eq("active", true),
    supabase.from("invoices").select("*").eq("student_id", id).order("due_date", { ascending: false }).limit(5),
    supabase.from("fee_plans").select("*").eq("student_id", id).eq("active", true).maybeSingle(),
    supabase
      .from("class_occurrences")
      .select("id, start_at, status, teachers(profiles(full_name)), attendance(status, notes)")
      .eq("student_id", id)
      .gte("start_at", monthStart.toUTC().toISO()!)
      .lte("start_at", monthEnd.toUTC().toISO()!)
      .order("start_at"),
  ]);
  if (!student) notFound();

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

  const prevMonth = selectedMonth.minus({ months: 1 }).toFormat("yyyy-LL");
  const nextMonth = selectedMonth.plus({ months: 1 }).toFormat("yyyy-LL");

  const boundUpdate = updateStudent.bind(null, id);
  const boundDelete = deleteStudent.bind(null, id);
  const boundCreatePlan = createFeePlan.bind(null, id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={student.full_name}
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
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <StudentForm student={student} action={boundUpdate} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Monthly progress report — {selectedMonth.toFormat("MMMM yyyy")}</CardTitle>
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
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {!schedules || schedules.length === 0 ? (
                <p className="text-sm text-slate-500">No recurring classes yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {schedules.map((s) => (
                    <li key={s.id} className="rounded-lg bg-primary-50 px-3 py-2">
                      <p className="font-medium text-primary-900">
                        {s.teachers?.profiles?.full_name}
                      </p>
                      <p className="text-slate-500">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][s.day_of_week]}{" "}
                        {s.local_start_time} ({s.timezone}) · {s.duration_minutes}m
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fee plan</CardTitle>
            </CardHeader>
            <CardContent>
              {feePlan ? (
                <p className="text-sm text-primary-900">
                  {feePlan.currency} {Number(feePlan.monthly_amount).toFixed(2)} / month · billed on day{" "}
                  {feePlan.billing_day} · {feePlan.classes_per_week} classes/week
                </p>
              ) : (
                <form action={boundCreatePlan} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="monthly_amount">Monthly amount</Label>
                      <Input id="monthly_amount" name="monthly_amount" type="number" step="0.01" required />
                    </div>
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Input id="currency" name="currency" defaultValue="USD" />
                    </div>
                    <div>
                      <Label htmlFor="billing_day">Billing day</Label>
                      <Input id="billing_day" name="billing_day" type="number" min={1} max={28} defaultValue={1} />
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
                  </div>
                  <Button type="submit" size="sm">
                    Set fee plan
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {!invoices || invoices.length === 0 ? (
                <p className="text-sm text-slate-500">No invoices yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {invoices.map((inv) => (
                    <li key={inv.id} className="flex justify-between rounded-lg bg-primary-50 px-3 py-2">
                      <span>{inv.currency} {Number(inv.amount).toFixed(2)}</span>
                      <span className="capitalize text-slate-500">{inv.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
