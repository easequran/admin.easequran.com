import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { LeadsBoard } from "@/components/leads/leads-board";
import { FollowUpsButton } from "@/components/leads/follow-ups-button";
import { Pagination } from "@/components/ui/pagination";
import { parsePageParam, pageRange, pageCount, DEFAULT_PAGE_SIZE } from "@/lib/utils/pagination";
import { buildIlikeOr } from "@/lib/utils/search";
import type { Lead } from "@/lib/types/database";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import { Users, Target, CheckCircle2, Clock } from "lucide-react";

export default async function LeadsPage({
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
  const nowIso = DateTime.utc().toISO()!;
  const orFilter = buildIlikeOr(q, ["full_name", "email", "phone", "country", "source"]);

  let listQuery = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (orFilter) listQuery = listQuery.or(orFilter);

  // Stat cards are global counts (independent of the search filter).
  const [
    { data: leads, count },
    { data: assignees },
    { count: totalCount },
    { count: openCount },
    { count: convertedCount },
    { count: overdueCount },
  ] = await Promise.all([
    listQuery,
    supabase.from("profiles").select("id, full_name").in("role", ["admin", "teacher"]).order("full_name"),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).not("status", "in", "(converted,lost)"),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "converted"),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .not("status", "in", "(converted,lost)")
      .not("next_follow_up_at", "is", null)
      .lt("next_follow_up_at", nowIso),
  ]);

  const rows = (leads as Lead[] | null) ?? [];
  const totalPages = pageCount(count ?? 0, DEFAULT_PAGE_SIZE);
  if (page > totalPages) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (totalPages > 1) sp.set("page", String(totalPages));
    redirect(sp.toString() ? `/leads?${sp}` : "/leads");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        icon={Target}
        description="Your prospective-student pipeline, from first contact to enrollment."
        actions={
          <>
            <FollowUpsButton overdueCount={overdueCount ?? 0} />
            <LinkButton href="/leads/new">Add lead</LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total leads" value={totalCount ?? 0} icon={Users} tone="info" />
        <StatCard label="Open" value={openCount ?? 0} icon={Target} tone="accent" />
        <StatCard label="Converted" value={convertedCount ?? 0} icon={CheckCircle2} tone="success" />
        <StatCard
          label="Overdue follow-ups"
          value={overdueCount ?? 0}
          icon={Clock}
          tone={(overdueCount ?? 0) > 0 ? "danger" : "neutral"}
          href="/leads/follow-ups"
        />
      </div>

      <SectionHeading icon={Target} title="Lead pipeline" description="Search, filter, and manage every lead's stage." />
      <LeadsBoard
        leads={rows}
        assignees={assignees ?? []}
        query={q}
        totalMatching={count ?? 0}
        totalPages={totalPages}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={count ?? undefined}
        basePath="/leads"
        baseParams={{ q }}
        itemLabel="leads"
      />
    </div>
  );
}
