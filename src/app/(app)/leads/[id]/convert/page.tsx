import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { convertLeadWithAssignment } from "@/lib/actions/leads";
import { WeeklyScheduleFields } from "@/components/students/weekly-schedule-fields";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { notFound } from "next/navigation";

export default async function ConvertLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: lead }, { data: teachers }] = await Promise.all([
    supabase.from("leads").select("id, full_name, converted_student_id").eq("id", id).single(),
    supabase.from("teachers").select("id, hourly_rate, currency, profiles(full_name)").eq("active", true),
  ]);
  if (!lead) notFound();

  if (lead.converted_student_id) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teacherOptions = ((teachers ?? []) as any[]).map((t) => ({
    id: t.id,
    name: t.profiles?.full_name ?? "Unnamed",
    hourlyRate: t.hourly_rate,
    currency: t.currency,
  }));

  const boundConvert = convertLeadWithAssignment.bind(null, id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Convert ${lead.full_name} to a student`}
        backHref={`/leads/${id}`}
        backLabel="Back to lead"
      />

      <form action={boundConvert} className="max-w-xl space-y-4">
        <p className="text-sm text-slate-500">
          This creates the student record right away. Assigning a teacher and weekly schedule below is optional —
          you can always set it up later from the student&apos;s page.
        </p>

        <WeeklyScheduleFields teachers={teacherOptions} />

        <Button type="submit" className="w-full">
          Convert to student
        </Button>
      </form>
    </div>
  );
}
