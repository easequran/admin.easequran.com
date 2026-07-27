import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { LeadsBoard } from "@/components/leads/leads-board";
import type { Lead } from "@/lib/types/database";
import Link from "next/link";
import { DateTime } from "luxon";

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: leads } = await supabase.from("leads").select("*").order("created_at", { ascending: false });

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
            <Link href="/leads/follow-ups" prefetch={false}>
              <Badge tone={overdueCount > 0 ? "danger" : "neutral"} className="cursor-pointer px-3 py-1.5">
                {overdueCount > 0 ? `${overdueCount} overdue follow-up${overdueCount > 1 ? "s" : ""}` : "Follow-ups"}
              </Badge>
            </Link>
            <LinkButton href="/leads/new">Add lead</LinkButton>
          </>
        }
      />
      <LeadsBoard leads={(leads as Lead[] | null) ?? []} />
    </div>
  );
}
