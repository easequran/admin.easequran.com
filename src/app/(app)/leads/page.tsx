import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { LeadsBoard } from "@/components/leads/leads-board";
import { FollowUpsButton } from "@/components/leads/follow-ups-button";
import type { Lead } from "@/lib/types/database";
import { DateTime } from "luxon";
import { Users, Target, CheckCircle2, Clock } from "lucide-react";

export default async function LeadsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: leads }, { data: assignees }] = await Promise.all([
    supabase.from("leads").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name").in("role", ["admin", "teacher"]).order("full_name"),
  ]);

  const rows = (leads as Lead[] | null) ?? [];
  const now = DateTime.now();
  const overdueCount = rows.filter(
    (l) => l.next_follow_up_at && DateTime.fromISO(l.next_follow_up_at) < now,
  ).length;
  const openCount = rows.filter((l) => l.status !== "converted" && l.status !== "lost").length;
  const convertedCount = rows.filter((l) => l.status === "converted").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Your prospective-student pipeline, from first contact to enrollment."
        actions={
          <>
            <FollowUpsButton overdueCount={overdueCount} />
            <LinkButton href="/leads/new">Add lead</LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total leads" value={rows.length} icon={Users} tone="info" />
        <StatCard label="Open" value={openCount} icon={Target} tone="accent" />
        <StatCard label="Converted" value={convertedCount} icon={CheckCircle2} tone="success" />
        <StatCard
          label="Overdue follow-ups"
          value={overdueCount}
          icon={Clock}
          tone={overdueCount > 0 ? "danger" : "neutral"}
        />
      </div>

      <LeadsBoard leads={rows} assignees={assignees ?? []} />
    </div>
  );
}
