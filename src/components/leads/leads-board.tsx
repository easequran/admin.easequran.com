"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { UserPlus, Download, X } from "lucide-react";
import { DateTime } from "luxon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { downloadCsv } from "@/lib/utils/csv";
import { bulkUpdateLeadStatus, bulkAssignLeads } from "@/lib/actions/leads";
import type { Lead, LeadStatus } from "@/lib/types/database";

const STAGES: { key: LeadStatus; label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" | "accent"; stripe: string }[] = [
  { key: "new", label: "New", tone: "info", stripe: "border-t-blue-400" },
  { key: "contacted", label: "Contacted", tone: "warning", stripe: "border-t-amber-400" },
  { key: "trial_scheduled", label: "Trial scheduled", tone: "accent", stripe: "border-t-accent-500" },
  { key: "trial_completed", label: "Trial completed", tone: "accent", stripe: "border-t-accent-500" },
  { key: "converted", label: "Converted", tone: "success", stripe: "border-t-emerald-500" },
  { key: "lost", label: "Lost", tone: "danger", stripe: "border-t-red-400" },
];

export function LeadsBoard({ leads, assignees }: { leads: Lead[]; assignees: { id: string; full_name: string }[] }) {
  const [query, setQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<LeadStatus>("contacted");
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [isPending, startTransition] = useTransition();
  const now = DateTime.now();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.full_name, l.email, l.phone, l.country, l.source].filter(Boolean).some((field) => field!.toLowerCase().includes(q)),
    );
  }, [leads, query]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  function handleExportCsv() {
    const rows = leads.filter((l) => selected.has(l.id));
    downloadCsv(
      `leads-${DateTime.now().toFormat("yyyy-LL-dd")}.csv`,
      [
        { key: "full_name", label: "Full name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "country", label: "Country" },
        { key: "source", label: "Source" },
        { key: "status", label: "Status" },
        { key: "notes", label: "Notes" },
        { key: "created_at", label: "Created at" },
      ],
      rows,
    );
  }

  function handleApplyStatus() {
    const ids = Array.from(selected);
    startTransition(async () => {
      await bulkUpdateLeadStatus(ids, bulkStatus);
      exitSelectMode();
    });
  }

  function handleApplyAssign() {
    if (!bulkAssignee) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      await bulkAssignLeads(ids, bulkAssignee);
      exitSelectMode();
    });
  }

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
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Search leads..." />
        </div>
        <Button variant={selectMode ? "outline" : "ghost"} size="sm" onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}>
          {selectMode ? "Cancel selection" : "Select"}
        </Button>
      </div>

      {selectMode && (
        <Card className="flex flex-wrap items-center gap-3 border-accent-300 bg-accent-50 p-3">
          <span className="text-sm font-medium text-primary-900">{selected.size} selected</span>

          <div className="flex items-center gap-2">
            <Select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as LeadStatus)} className="w-auto">
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Button size="sm" onClick={handleApplyStatus} disabled={selected.size === 0 || isPending}>
              Set status
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Select value={bulkAssignee} onChange={(e) => setBulkAssignee(e.target.value)} className="w-auto">
              <option value="">Assign to…</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name}
                </option>
              ))}
            </Select>
            <Button size="sm" onClick={handleApplyAssign} disabled={selected.size === 0 || !bulkAssignee || isPending}>
              Assign
            </Button>
          </div>

          <Button size="sm" variant="outline" onClick={handleExportCsv} disabled={selected.size === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>

          <button type="button" onClick={exitSelectMode} className="ml-auto rounded-md p-1.5 text-primary-700 hover:bg-primary-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </Card>
      )}

      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
        {STAGES.map((stage) => {
          const items = filtered.filter((l) => l.status === stage.key);
          return (
            <Card key={stage.key} className={`flex w-[280px] shrink-0 snap-start flex-col border-t-4 ${stage.stripe}`}>
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-primary-100 bg-white px-3 py-2.5 rounded-t-[11px]">
                <Badge tone={stage.tone}>{stage.label}</Badge>
                <span className="text-xs font-medium text-slate-400">{items.length}</span>
              </div>
              <div className="max-h-[70vh] flex-1 space-y-2 overflow-y-auto p-3">
                {items.map((l) => {
                  const overdue = l.next_follow_up_at && DateTime.fromISO(l.next_follow_up_at) < now;
                  const card = (
                    <div
                      className={`rounded-lg border p-3 text-sm shadow-sm transition-shadow hover:shadow-md hover:border-primary-200 ${
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
                    </div>
                  );
                  return (
                    <div key={l.id} className="flex items-start gap-2">
                      {selectMode && (
                        <input
                          type="checkbox"
                          className="mt-4 h-4 w-4 shrink-0 rounded border-primary-300"
                          checked={selected.has(l.id)}
                          onChange={() => toggleSelected(l.id)}
                        />
                      )}
                      {selectMode ? (
                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => toggleSelected(l.id)}>
                          {card}
                        </button>
                      ) : (
                        <Link key={l.id} href={`/leads/${l.id}`} prefetch={false} className="min-w-0 flex-1">
                          {card}
                        </Link>
                      )}
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-slate-400">
                    {query ? "No matches" : "No leads at this stage"}
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
