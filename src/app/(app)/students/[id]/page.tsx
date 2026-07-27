import { createClient } from "@/lib/supabase/server";
import { StudentForm } from "@/components/students/student-form";
import { updateStudent, deleteStudent } from "@/lib/actions/students";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { createFeePlan } from "@/lib/actions/invoices";
import { PageHeader } from "@/components/ui/page-header";
import { notFound } from "next/navigation";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("*").eq("id", id).single();
  if (!student) notFound();

  const { data: schedules } = await supabase
    .from("recurring_schedules")
    .select("*, teachers(profiles(full_name))")
    .eq("student_id", id)
    .eq("active", true);

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("student_id", id)
    .order("due_date", { ascending: false })
    .limit(5);

  const { data: feePlan } = await supabase
    .from("fee_plans")
    .select("*")
    .eq("student_id", id)
    .eq("active", true)
    .maybeSingle();

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
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <StudentForm student={student} action={boundUpdate} />
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
