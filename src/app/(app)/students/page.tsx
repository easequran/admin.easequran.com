import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { StudentsTable } from "@/components/students/students-table";
import { Pagination } from "@/components/ui/pagination";
import { parsePageParam, pageRange, pageCount, DEFAULT_PAGE_SIZE } from "@/lib/utils/pagination";
import { buildIlikeOr } from "@/lib/utils/search";
import type { Student } from "@/lib/types/database";
import { redirect } from "next/navigation";
import { Users, UserCheck, PauseCircle } from "lucide-react";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin();
  const supabase = await createClient();

  const { q: rawQ, page: pageParam } = await searchParams;
  const q = (rawQ ?? "").trim();
  const page = parsePageParam(pageParam);
  const { from, to } = pageRange(page);
  const orFilter = buildIlikeOr(q, ["full_name", "country", "guardian_name", "guardian_email"]);

  // Trial students live in the Trials/Leads pipeline, not here.
  let listQuery = supabase
    .from("students")
    .select("*", { count: "exact" })
    .neq("enrollment_status", "trial")
    .order("created_at", { ascending: false })
    .range(from, to);
  if (orFilter) listQuery = listQuery.or(orFilter);

  // Stat-card totals are global (not affected by the search filter); the
  // pagination line below the table reflects the filtered result.
  const [
    { data: students, count },
    { count: totalCount },
    { count: activeCount },
    { count: pausedCount },
  ] = await Promise.all([
    listQuery,
    supabase.from("students").select("*", { count: "exact", head: true }).neq("enrollment_status", "trial"),
    supabase.from("students").select("*", { count: "exact", head: true }).eq("enrollment_status", "active"),
    supabase.from("students").select("*", { count: "exact", head: true }).eq("enrollment_status", "paused"),
  ]);

  const totalPages = pageCount(count ?? 0, DEFAULT_PAGE_SIZE);
  // A stale bookmark / manual URL past the last page is a dead end -- send it
  // to the last valid page instead of an empty table with no way back.
  if (page > totalPages) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (totalPages > 1) sp.set("page", String(totalPages));
    redirect(sp.toString() ? `/students?${sp}` : "/students");
  }

  const rows = (students as Student[] | null) ?? [];

  // Teacher column: only look up the students actually on this page.
  const visibleIds = rows.map((s) => s.id);
  const teacherByStudent = new Map<string, string>();
  if (visibleIds.length > 0) {
    const { data: schedules } = await supabase
      .from("recurring_schedules")
      .select("student_id, teachers(profiles(full_name))")
      .eq("active", true)
      .in("student_id", visibleIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of (schedules ?? []) as any[]) {
      const name = s.teachers?.profiles?.full_name;
      if (!name) continue;
      const existing = teacherByStudent.get(s.student_id);
      if (!existing) teacherByStudent.set(s.student_id, name);
      else if (!existing.split(", ").includes(name)) teacherByStudent.set(s.student_id, `${existing}, ${name}`);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        icon={Users}
        description="Everyone currently enrolled or paused. Trial students live in the Trials/Leads pipeline until converted."
        actions={<LinkButton href="/students/new">Add student</LinkButton>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total students" value={totalCount ?? 0} icon={Users} tone="info" />
        <StatCard label="Active" value={activeCount ?? 0} icon={UserCheck} tone="success" />
        <StatCard label="Paused" value={pausedCount ?? 0} icon={PauseCircle} tone={(pausedCount ?? 0) > 0 ? "warning" : "neutral"} />
      </div>

      <SectionHeading icon={Users} title="Student directory" description="Search by name, country or guardian, and manage enrollment status." />
      <StudentsTable
        students={rows}
        teacherByStudent={Object.fromEntries(teacherByStudent)}
        query={q}
        totalMatching={count ?? 0}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={count ?? undefined}
        basePath="/students"
        baseParams={{ q }}
        itemLabel="students"
      />
    </div>
  );
}
