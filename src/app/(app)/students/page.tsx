import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StudentsTable } from "@/components/students/students-table";
import type { Student } from "@/lib/types/database";

export default async function StudentsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: students }, { data: schedules }] = await Promise.all([
    supabase.from("students").select("*").order("created_at", { ascending: false }),
    supabase
      .from("recurring_schedules")
      .select("student_id, teachers(profiles(full_name))")
      .eq("active", true),
  ]);

  const teacherByStudent = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of (schedules ?? []) as any[]) {
    const name = s.teachers?.profiles?.full_name;
    if (!name) continue;
    const existing = teacherByStudent.get(s.student_id);
    if (!existing) teacherByStudent.set(s.student_id, name);
    else if (!existing.split(", ").includes(name)) teacherByStudent.set(s.student_id, `${existing}, ${name}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Everyone currently enrolled, on trial, or paused."
        actions={<LinkButton href="/students/new">Add student</LinkButton>}
      />
      <StudentsTable
        students={(students as Student[] | null) ?? []}
        teacherByStudent={Object.fromEntries(teacherByStudent)}
      />
    </div>
  );
}
