import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { TeachersTable, type TeacherRow } from "@/components/teachers/teachers-table";
import { GraduationCap, UserCheck, UserX } from "lucide-react";

export default async function TeachersPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: teachers } = await supabase
    .from("teachers")
    .select("*, profiles(full_name, email, timezone)")
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: TeacherRow[] = ((teachers ?? []) as any[]).map((t) => ({
    id: t.id,
    fullName: t.profiles?.full_name ?? "Unnamed",
    email: t.profiles?.email ?? null,
    timezone: t.profiles?.timezone ?? null,
    hourlyRate: t.hourly_rate,
    currency: t.currency,
    active: t.active,
  }));

  const activeCount = rows.filter((t) => t.active).length;
  const inactiveCount = rows.length - activeCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teachers"
        icon={GraduationCap}
        tone="success"
        description="Everyone teaching classes at the academy."
        actions={<LinkButton href="/teachers/new">Add teacher</LinkButton>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total teachers" value={rows.length} icon={GraduationCap} tone="info" />
        <StatCard label="Active" value={activeCount} icon={UserCheck} tone="success" />
        <StatCard label="Disabled" value={inactiveCount} icon={UserX} tone={inactiveCount > 0 ? "warning" : "neutral"} />
      </div>

      <SectionHeading icon={GraduationCap} tone="success" title="Teacher directory" description="Manage profiles, rates, and active status." />
      <TeachersTable teachers={rows} />
    </div>
  );
}
