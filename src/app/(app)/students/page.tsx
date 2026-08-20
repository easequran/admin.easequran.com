import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { StudentsTable } from "@/components/students/students-table";
import type { Student } from "@/lib/types/database";
import { Users, UserCheck, PauseCircle } from "lucide-react";

export default async function StudentsPage() {
  await requireAdmin();
  const supabase = await createClient();
  // Trial students live in the Trials/Leads pipeline, not here -- a lead
  // only becomes a Students row once admin explicitly converts it.
  const [{ data: students }, { data: schedules }] = await Promise.all([
    supabase.from("students").select("*").neq("enrollment_status", "trial").order("created_at", { ascending: false }),
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

  const rows = (students as Student[] | null) ?? [];
  const activeCount = rows.filter((s) => s.enrollment_status === "active").length;
  const pausedCount = rows.filter((s) => s.enrollment_status === "paused").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Everyone currently enrolled or paused. Trial students live in the Trials/Leads pipeline until converted."
        actions={<LinkButton href="/students/new">Add student</LinkButton>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total students" value={rows.length} icon={Users} tone="info" />
        <StatCard label="Active" value={activeCount} icon={UserCheck} tone="success" />
        <StatCard label="Paused" value={pausedCount} icon={PauseCircle} tone={pausedCount > 0 ? "warning" : "neutral"} />
      </div>

      <SectionHeading icon={Users} tone="info" title="Student directory" description="Search, filter, and manage enrollment status." />
      <StudentsTable
        students={rows}
        teacherByStudent={Object.fromEntries(teacherByStudent)}
      />
    </div>
  );
}
