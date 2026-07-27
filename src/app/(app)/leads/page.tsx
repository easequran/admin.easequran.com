import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { LeadStatus } from "@/lib/types/database";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-primary-900">Leads</h1>
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
                {items.map((l) => (
                  <Link
                    key={l.id}
                    href={`/leads/${l.id}`}
                    prefetch={false}
                    className="block rounded-lg border border-primary-50 bg-white p-2 text-sm shadow-sm hover:border-primary-200"
                  >
                    <p className="font-medium text-primary-900">{l.full_name}</p>
                    <p className="text-xs text-slate-500">{l.country ?? l.email ?? "—"}</p>
                  </Link>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
