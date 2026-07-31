import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { TeacherDashboardView } from "@/components/teachers/teacher-dashboard-view";
import { PageHeader } from "@/components/ui/page-header";
import { notFound } from "next/navigation";

export default async function TeacherDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();

  const { data: teacher } = await supabase
    .from("teachers")
    .select("profile_id, profiles(full_name, timezone)")
    .eq("id", id)
    .single();
  if (!teacher) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (teacher as any).profiles;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${profile?.full_name ?? "Teacher"}'s dashboard`}
        backHref={`/teachers/${id}`}
        backLabel="Back to teacher"
      />
      <TeacherDashboardView
        teacherId={id}
        profileId={teacher.profile_id}
        timezone={profile?.timezone ?? "UTC"}
        returnPath={`/teachers/${id}/dashboard`}
      />
    </div>
  );
}
