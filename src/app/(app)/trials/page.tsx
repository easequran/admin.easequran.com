import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { LinkButton } from "@/components/ui/button";
import { OccurrenceList } from "@/components/schedule/occurrence-list";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { CalendarClock, Clock, CheckCircle2, XCircle } from "lucide-react";

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
    .select("id, start_at, status, is_trial, leads(id, full_name, status), teachers(profiles(full_name))")
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
    leadId: t.leads?.id,
    leadConverted: t.leads?.status === "converted",
  }));

  const upcomingCount = mapped.filter((t) => t.status === "scheduled").length;
  const completedCount = mapped.filter((t) => t.status === "completed").length;
  const missedCount = mapped.filter((t) => t.status === "no_show" || t.status === "cancelled").length;

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total trials" value={mapped.length} icon={CalendarClock} tone="info" />
        <StatCard label="Upcoming" value={upcomingCount} icon={Clock} tone="accent" />
        <StatCard label="Completed" value={completedCount} icon={CheckCircle2} tone="success" />
        <StatCard label="Missed / cancelled" value={missedCount} icon={XCircle} tone={missedCount > 0 ? "warning" : "neutral"} />
      </div>

      <SectionCard icon={CalendarClock} tone="accent" title="Trial bookings">
        <OccurrenceList occurrences={mapped} viewerTimezone={profile.timezone} editBasePath="/trials" showStatusActions />
      </SectionCard>
    </div>
  );
}
