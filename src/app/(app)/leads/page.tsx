import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { LeadStatus } from "@/lib/types/database";
import { DateTime } from "luxon";

const STAGES: { key: LeadStatus; label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" | "accent" }[] = [
  { key: "new", label: "New", tone: "info" },
  { key: "contacted", label: "Contacted", tone: "warning" },
  { key: "trial_scheduled", label: "Trial scheduled", tone: "accent" },
  { key: "trial_completed", label: "Trial completed", tone: "accent" },
  { key: "converted", label: "Converted", tone: "success" },
  { key: "lost", label: "Lost", tone: "danger" },
];

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: leads } = await supabase.from("leads").select("*").order("created_at", { ascending: false });

  const now = DateTime.now();
  const overdueCount = (leads ?? []).filter(
    (l) => l.next_follow_up_at && DateTime.fromISO(l.next_follow_up_at) < now,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-primary-900">Leads</h1>
          <Link href="/leads/follow-ups" prefetch={false}>
            <Badge tone={overdueCount > 0 ? "danger" : "neutral"}>
              {overdueCount > 0 ? `${overdueCount} overdue follow-up${overdueCount > 1 ? "s" : ""}` : "Follow-ups"}
            </Badge>
          </Link>
        </div>
        <LinkButton href="/leads/new">Add lead</LinkButton>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {STAGES.map((stage) => {
          const items = (leads ?? []).filter((l) => l.status === stage.key);
          return (
            <Card key={stage.key} className="flex flex-col">
              <div className="flex items-center justify-between border-b border-primary-100 px-3 py-2">
                <Badge tone={stage.tone}>{stage.label}</Badge>
                <span className="text-xs text-slate-400">{items.length}</span>
              </div>
              <div className="flex-1 space-y-2 p-2">
                {items.map((l) => {
                  const overdue = l.next_follow_up_at && DateTime.fromISO(l.next_follow_up_at) < now;
                  return (
                    <Link
                      key={l.id}
                      href={`/leads/${l.id}`}
                      prefetch={false}
                      className={`block rounded-lg border p-2 text-sm shadow-sm hover:border-primary-200 ${
                        overdue ? "border-red-200 bg-red-50" : "border-primary-50 bg-white"
                      }`}
                    >
                      <p className="font-medium text-primary-900">{l.full_name}</p>
                      <p className="text-xs text-slate-500">{l.country ?? l.email ?? "—"}</p>
                      {l.next_follow_up_at && (
                        <p className={`mt-1 text-xs font-medium ${overdue ? "text-red-600" : "text-slate-400"}`}>
                          {overdue ? "Overdue: " : "Follow up: "}
                          {DateTime.fromISO(l.next_follow_up_at).toRelative()}
                        </p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
