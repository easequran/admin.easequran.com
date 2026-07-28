import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { TeachersTable, type TeacherRow } from "@/components/teachers/teachers-table";

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teachers"
        description="Everyone teaching classes at the academy."
        actions={<LinkButton href="/teachers/new">Add teacher</LinkButton>}
      />
      <TeachersTable teachers={rows} />
    </div>
  );
}
