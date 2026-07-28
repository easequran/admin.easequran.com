import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LeadsBoard } from "@/components/leads/leads-board";
import { FollowUpsButton } from "@/components/leads/follow-ups-button";
import type { Lead } from "@/lib/types/database";
import { DateTime } from "luxon";

export default async function LeadsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: leads }, { data: assignees }] = await Promise.all([
    supabase.from("leads").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name").in("role", ["admin", "teacher"]).order("full_name"),
  ]);

  const now = DateTime.now();
  const overdueCount = (leads ?? []).filter(
    (l) => l.next_follow_up_at && DateTime.fromISO(l.next_follow_up_at) < now,
  ).length;

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
      <LeadsBoard leads={(leads as Lead[] | null) ?? []} assignees={assignees ?? []} />
    </div>
  );
}
