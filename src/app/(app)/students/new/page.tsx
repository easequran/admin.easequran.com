import { StudentForm } from "@/components/students/student-form";
import { WeeklyScheduleFields } from "@/components/students/weekly-schedule-fields";
import { createStudentAction } from "@/lib/actions/form-actions";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { PageHeader } from "@/components/ui/page-header";
import { UserPlus } from "lucide-react";

export default async function NewStudentPage() {
  await requireAdmin();
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
      <PageHeader title="Add student" icon={UserPlus} tone="info" backHref="/students" backLabel="Back to Students" />
      <StudentForm action={createStudentAction}>
        <WeeklyScheduleFields teachers={teacherOptions} />
      </StudentForm>
    </div>
  );
}
