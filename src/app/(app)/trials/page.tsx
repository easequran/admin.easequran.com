import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { LinkButton } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OccurrenceList } from "@/components/schedule/occurrence-list";
import { PageHeader } from "@/components/ui/page-header";

export default async function TrialsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: trials } = await supabase
    .from("class_occurrences")
    .select("id, start_at, status, is_trial, leads(full_name), teachers(profiles(full_name))")
    .eq("is_trial", true)
    .order("start_at", { ascending: false })
    .limit(50);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = ((trials ?? []) as any[]).map((t) => ({
    id: t.id,
    start_at: t.start_at,
    status: t.status,
    is_trial: t.is_trial,
    studentName: t.leads?.full_name,
    teacherName: t.teachers?.profiles?.full_name,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trial classes"
        description="Upcoming and past trial bookings."
        actions={<LinkButton href="/trials/new">Book trial class</LinkButton>}
      />

      {params.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      )}

      <Card>
        <CardContent>
          <OccurrenceList occurrences={mapped} viewerTimezone={profile.timezone} editBasePath="/trials" />
        </CardContent>
      </Card>
    </div>
  );
}
