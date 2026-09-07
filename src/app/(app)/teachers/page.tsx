import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { TeachersTable, type TeacherRow } from "@/components/teachers/teachers-table";
import { Pagination } from "@/components/ui/pagination";
import { parsePageParam, pageRange, pageCount, DEFAULT_PAGE_SIZE } from "@/lib/utils/pagination";
import { sanitizeSearch } from "@/lib/utils/search";
import { GraduationCap, UserCheck, UserX } from "lucide-react";

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin();
  const supabase = await createClient();

  const { q: rawQ, page: pageParam } = await searchParams;
  const q = sanitizeSearch(rawQ);
  const page = parsePageParam(pageParam);
  const { from, to } = pageRange(page);

  // Name/email live on `profiles`, so a search resolves to profile ids first,
  // then the teacher rows are paged over that set.
  let matchingProfileIds: string[] | null = null;
  if (q) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "teacher")
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
    matchingProfileIds = (profs ?? []).map((p) => p.id as string);
  }

  let listQuery = supabase
    .from("teachers")
    .select("*, profiles(full_name, email, timezone)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (matchingProfileIds) {
    listQuery = listQuery.in("profile_id", matchingProfileIds.length > 0 ? matchingProfileIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  const [{ data: teachers, count }, { count: totalCount }, { count: activeCount }] = await Promise.all([
    listQuery,
    supabase.from("teachers").select("*", { count: "exact", head: true }),
    supabase.from("teachers").select("*", { count: "exact", head: true }).eq("active", true),
  ]);

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

  const inactiveCount = (totalCount ?? 0) - (activeCount ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teachers"
        icon={GraduationCap}
        description="Everyone teaching classes at the academy."
        actions={<LinkButton href="/teachers/new">Add teacher</LinkButton>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total teachers" value={totalCount ?? 0} icon={GraduationCap} tone="info" />
        <StatCard label="Active" value={activeCount ?? 0} icon={UserCheck} tone="success" />
        <StatCard label="Disabled" value={inactiveCount} icon={UserX} tone={inactiveCount > 0 ? "warning" : "neutral"} />
      </div>

      <SectionHeading icon={GraduationCap} title="Teacher directory" description="Search by name or email; manage profiles, rates and active status." />
      <TeachersTable teachers={rows} hasQuery={Boolean(rawQ?.trim())} />

      <Pagination
        page={page}
        totalPages={pageCount(count ?? 0, DEFAULT_PAGE_SIZE)}
        totalItems={count ?? undefined}
        basePath="/teachers"
        baseParams={{ q: rawQ }}
        itemLabel="teachers"
      />
    </div>
  );
}
