import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StudentsTable } from "@/components/students/students-table";
import type { Student } from "@/lib/types/database";

export default async function StudentsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Everyone currently enrolled, on trial, or paused."
        actions={<LinkButton href="/students/new">Add student</LinkButton>}
      />
      <StudentsTable students={(students as Student[] | null) ?? []} />
    </div>
  );
}
