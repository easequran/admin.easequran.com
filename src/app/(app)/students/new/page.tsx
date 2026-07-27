import { StudentForm } from "@/components/students/student-form";
import { WeeklyScheduleFields } from "@/components/students/weekly-schedule-fields";
import { createStudent } from "@/lib/actions/students";
import { createClient } from "@/lib/supabase/server";

export default async function NewStudentPage() {
  const supabase = await createClient();
  const { data: teachers } = await supabase
    .from("teachers")
    .select("id, hourly_rate, currency, profiles(full_name)")
    .eq("active", true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teacherOptions = ((teachers ?? []) as any[]).map((t) => ({
    id: t.id,
    name: t.profiles?.full_name ?? "Unnamed",
    hourlyRate: t.hourly_rate,
    currency: t.currency,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-primary-900">Add student</h1>
      <StudentForm action={createStudent}>
        <WeeklyScheduleFields teachers={teacherOptions} />
      </StudentForm>
    </div>
  );
}
