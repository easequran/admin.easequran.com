"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { DateTime } from "luxon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import type { Lead, LeadStatus } from "@/lib/types/database";

const STAGES: { key: LeadStatus; label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" | "accent" }[] = [
  { key: "new", label: "New", tone: "info" },
  { key: "contacted", label: "Contacted", tone: "warning" },
  { key: "trial_scheduled", label: "Trial scheduled", tone: "accent" },
  { key: "trial_completed", label: "Trial completed", tone: "accent" },
  { key: "converted", label: "Converted", tone: "success" },
  { key: "lost", label: "Lost", tone: "danger" },
];

export function LeadsBoard({ leads }: { leads: Lead[] }) {
  const [query, setQuery] = useState("");
  const now = DateTime.now();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.full_name, l.email, l.phone, l.country, l.source].filter(Boolean).some((field) => field!.toLowerCase().includes(q)),
    );
  }, [leads, query]);

  if (leads.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={UserPlus}
          title="No leads yet"
          description="Add a lead to start tracking prospective students."
          action={<LinkButton href="/leads/new">Add lead</LinkButton>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search leads..." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {STAGES.map((stage) => {
          const items = filtered.filter((l) => l.status === stage.key);
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
                {items.length === 0 && query && (
                  <p className="px-1 py-4 text-center text-xs text-slate-400">No matches</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
