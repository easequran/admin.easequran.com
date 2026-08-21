import { getCurrentProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { SectionCard } from "@/components/ui/section-card";
import { NewScheduleForm } from "@/components/schedule/new-schedule-form";
import { OccurrenceTable } from "@/components/schedule/occurrence-table";
import { PageHeader } from "@/components/ui/page-header";
import { DateTime } from "luxon";
import { CalendarDays, CalendarClock, CalendarPlus, CalendarRange } from "lucide-react";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  let occurrenceQuery = supabase
    .from("class_occurrences")
    .select(
      profile.role === "teacher"
        ? "id, start_at, status, is_trial, students(full_name), teachers!inner(profile_id, profiles(full_name))"
        : profile.role === "student"
          ? "id, start_at, status, is_trial, students!inner(full_name, profile_id), teachers(profiles(full_name))"
          : "id, start_at, status, is_trial, students(full_name), teachers(profiles(full_name))",
    )
    .gte("start_at", DateTime.utc().startOf("day").toISO()!)
    .order("start_at")
    .limit(50);

  if (profile.role === "teacher") {
    occurrenceQuery = occurrenceQuery.eq("teachers.profile_id", profile.id);
  } else if (profile.role === "student") {
    occurrenceQuery = occurrenceQuery.eq("students.profile_id", profile.id);
  }

  const todayStartLocal = DateTime.now().setZone(profile.timezone).startOf("day");
  const todayEndLocal = todayStartLocal.endOf("day");

  const isAdmin = profile.role === "admin";

  const [{ data: occurrences }, adminLists] = await Promise.all([
    occurrenceQuery,
    isAdmin
      ? Promise.all([
          supabase.from("students").select("id, full_name, timezone").eq("enrollment_status", "active"),
          supabase.from("teachers").select("id, profiles(full_name)").eq("active", true),
        ])
      : Promise.resolve(null),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = ((occurrences ?? []) as any[]).map((o) => ({
    id: o.id,
    start_at: o.start_at,
    status: o.status,
    is_trial: o.is_trial,
    studentName: o.students?.full_name,
    teacherName: o.teachers?.profiles?.full_name,
  }));

  const todayClasses = mapped.filter((o) => {
    const startLocal = DateTime.fromISO(o.start_at, { zone: "utc" }).setZone(profile.timezone);
    return startLocal >= todayStartLocal && startLocal <= todayEndLocal;
  });

  let studentsForForm: { id: string; full_name: string; timezone: string }[] = [];
  let teachersForForm: { id: string; name: string }[] = [];

  if (adminLists) {
    const [{ data: students }, { data: teachers }] = adminLists;
    studentsForForm = students ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    teachersForForm = ((teachers ?? []) as any[]).map((t) => ({
      id: t.id,
      name: t.profiles?.full_name ?? "Unnamed",
    }));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Schedule" description="Upcoming classes, shown in your own timezone." icon={CalendarRange} tone="info" />

      {params.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      )}

      <SectionCard icon={CalendarDays} tone="danger" title={`Today (${todayStartLocal.toFormat("EEEE, MMMM d")})`}>
        <OccurrenceTable occurrences={todayClasses} viewerTimezone={profile.timezone} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard icon={CalendarClock} tone="info" title={`Upcoming classes (${profile.timezone})`}>
            <OccurrenceTable occurrences={mapped} viewerTimezone={profile.timezone} />
          </SectionCard>
        </div>

        {profile.role === "admin" && (
          <SectionCard icon={CalendarPlus} tone="accent" title="Schedule a weekly class">
            <NewScheduleForm students={studentsForForm} teachers={teachersForForm} />
          </SectionCard>
        )}
      </div>
    </div>
  );
}
