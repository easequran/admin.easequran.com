"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { UserPlus, Download, X, LayoutGrid, List, ListChecks } from "lucide-react";
import { DateTime } from "luxon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TABLE_ELEMENT_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_HEAD_CELL_CLASS,
  TABLE_CELL_CLASS,
  TABLE_CELL_SECONDARY_CLASS,
  tableRowClass,
} from "@/lib/utils/table-styles";
import { cn } from "@/lib/utils/cn";
import { FOCUS_RING } from "@/lib/utils/focus";
import { Select } from "@/components/ui/input";
import { Button, LinkButton } from "@/components/ui/button";
import { TableSearch } from "@/components/ui/table-search";
import { EmptyState } from "@/components/ui/empty-state";
import { downloadCsv } from "@/lib/utils/csv";
import { bulkUpdateLeadStatus, bulkAssignLeads } from "@/lib/actions/leads";
import { exportLeadsCsv } from "@/lib/actions/exports";
import { toast } from "@/lib/toast";
import type { Lead, LeadStatus } from "@/lib/types/database";

type View = "table" | "board";

const STAGES: { key: LeadStatus; label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" | "accent"; stripe: string }[] = [
  { key: "new", label: "New", tone: "info", stripe: "border-t-blue-400" },
  { key: "contacted", label: "Contacted", tone: "warning", stripe: "border-t-amber-400" },
  { key: "trial_scheduled", label: "Trial scheduled", tone: "accent", stripe: "border-t-accent-500" },
  { key: "trial_completed", label: "Trial completed", tone: "accent", stripe: "border-t-accent-500" },
  { key: "converted", label: "Converted", tone: "success", stripe: "border-t-emerald-500" },
  { key: "lost", label: "Lost", tone: "danger", stripe: "border-t-red-400" },
];

const MANUAL_STAGES = STAGES.filter((s) => s.key !== "trial_scheduled" && s.key !== "trial_completed");

const CSV_COLUMNS = [
  { key: "full_name", label: "Full name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "country", label: "Country" },
  { key: "source", label: "Source" },
  { key: "status", label: "Status" },
  { key: "notes", label: "Notes" },
  { key: "created_at", label: "Created at" },
] as const;

export function LeadsBoard({
  leads,
  assignees,
  query = "",
  totalMatching = 0,
  totalPages = 1,
}: {
  leads: Lead[];
  assignees: { id: string; full_name: string }[];
  query?: string;
  totalMatching?: number;
  totalPages?: number;
}) {
  const [view, setView] = useState<View>("table");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<LeadStatus>("contacted");
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isExporting, startExport] = useTransition();
  const now = DateTime.now();
  const assigneeById = useMemo(() => new Map(assignees.map((a) => [a.id, a.full_name])), [assignees]);
  const hasQuery = Boolean(query.trim());
  const paged = totalPages > 1;

  function handleRowStatusChange(leadId: string, status: LeadStatus) {
    startTransition(async () => {
      await bulkUpdateLeadStatus([leadId], status);
      toast.success(`Status changed to ${status.replace("_", " ")}`);
    });
  }

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

  function handleExportSelected() {
    const rows = leads.filter((l) => selected.has(l.id));
    downloadCsv(`leads-selected-${DateTime.now().toFormat("yyyy-LL-dd")}.csv`, [...CSV_COLUMNS], rows);
  }

  function handleExportAll() {
    startExport(async () => {
      try {
        const rows = await exportLeadsCsv(query);
        downloadCsv(`leads-${DateTime.now().toFormat("yyyy-LL-dd")}.csv`, [...CSV_COLUMNS], rows);
        toast.success(`Exported ${rows.length} lead${rows.length === 1 ? "" : "s"}`);
      } catch {
        toast.error("Export failed");
      }
    });
  }

  function handleApplyStatus() {
    const ids = Array.from(selected);
    startTransition(async () => {
      await bulkUpdateLeadStatus(ids, bulkStatus);
      toast.success(`Updated ${ids.length} lead${ids.length === 1 ? "" : "s"} to ${bulkStatus.replace("_", " ")}`);
      exitSelectMode();
    });
  }

  function handleApplyAssign() {
    if (!bulkAssignee) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      await bulkAssignLeads(ids, bulkAssignee);
      toast.success(`Assigned ${ids.length} lead${ids.length === 1 ? "" : "s"}`);
      exitSelectMode();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <TableSearch placeholder="Search leads by name, email, phone, country…" />
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-primary-100 p-0.5">
            <button
              type="button"
              onClick={() => setView("table")}
              title="Table view"
              aria-pressed={view === "table"}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${FOCUS_RING} ${
                view === "table" ? "bg-accent-500 text-primary-900" : "text-primary-700 hover:bg-primary-50"
              }`}
            >
              <List className="h-3.5 w-3.5" /> Table
            </button>
            <button
              type="button"
              onClick={() => setView("board")}
              title="Board view"
              aria-pressed={view === "board"}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${FOCUS_RING} ${
                view === "board" ? "bg-accent-500 text-primary-900" : "text-primary-700 hover:bg-primary-50"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Board
            </button>
          </div>
          <Button size="sm" variant="outline" onClick={handleExportAll} disabled={isExporting}>
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting…" : hasQuery ? `Export all matching (${totalMatching})` : "Export all"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          >
            <ListChecks className="h-4 w-4" />
            {selectMode ? "Cancel selection" : "Select rows"}
          </Button>
        </div>
      </div>

      {selectMode && (
        <Card className="flex flex-wrap items-center gap-3 border-accent-300 bg-accent-50 p-3">
          <span className="text-sm font-medium text-primary-900">{selected.size} selected</span>

          <div className="flex items-center gap-2">
            <Select
              aria-label="Set lead stage"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as LeadStatus)}
              className="w-auto"
            >
              {MANUAL_STAGES.map((s) => (
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
            <Select
              aria-label="Assign selected leads to"
              value={bulkAssignee}
              onChange={(e) => setBulkAssignee(e.target.value)}
              className="w-auto"
            >
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

          <Button size="sm" variant="outline" onClick={handleExportSelected} disabled={selected.size === 0}>
            <Download className="h-4 w-4" /> Export selected
          </Button>

          <span className="w-full text-xs text-slate-500 sm:w-auto">
            Selection and bulk actions apply only to the leads on this page.
          </span>

          <button type="button" onClick={exitSelectMode} className={`ml-auto rounded-md p-1.5 text-primary-700 hover:bg-primary-100 ${FOCUS_RING}`} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </Card>
      )}

      {view === "table" ? (
        <LeadsTable
          leads={leads}
          assigneeById={assigneeById}
          selectMode={selectMode}
          selected={selected}
          toggleSelected={toggleSelected}
          onStatusChange={handleRowStatusChange}
          now={now}
          hasQuery={hasQuery}
        />
      ) : (
        <div className="space-y-2">
          {(paged || hasQuery) && (
            <p className="rounded-lg bg-primary-50 px-3 py-2 text-xs text-primary-700">
              Board shows the {leads.length} lead{leads.length === 1 ? "" : "s"} on this page
              {hasQuery ? " matching your search" : ""}
              {paged ? ` (of ${totalMatching})` : ""}. Use the table view or pagination below to see the rest.
            </p>
          )}
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
            {STAGES.map((stage) => {
              const items = leads.filter((l) => l.status === stage.key);
              return (
                <Card key={stage.key} className={`flex w-[280px] shrink-0 snap-start flex-col border-t-4 ${stage.stripe}`}>
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-primary-100 bg-white px-3 py-2.5 rounded-t-[11px]">
                    <Badge tone={stage.tone}>{stage.label}</Badge>
                    <span className="text-xs font-medium text-slate-500">{items.length}</span>
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
                            <p className={`mt-1 text-xs font-medium ${overdue ? "text-red-600" : "text-slate-500"}`}>
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
                              aria-label={`Select ${l.full_name}`}
                            />
                          )}
                          {selectMode ? (
                            <button type="button" className={`min-w-0 flex-1 rounded text-left ${FOCUS_RING}`} onClick={() => toggleSelected(l.id)}>
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
                      <p className="px-1 py-6 text-center text-xs text-slate-500">
                        {hasQuery ? "No matches on this page" : "No leads at this stage"}
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LeadsTable({
  leads,
  assigneeById,
  selectMode,
  selected,
  toggleSelected,
  onStatusChange,
  now,
  hasQuery,
}: {
  leads: Lead[];
  assigneeById: Map<string, string>;
  selectMode: boolean;
  selected: Set<string>;
  toggleSelected: (id: string) => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  now: DateTime;
  hasQuery: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className={cn(TABLE_ELEMENT_CLASS, "min-w-[880px]")}>
          <thead className={TABLE_HEAD_CLASS}>
            <tr>
              {selectMode && <th className={cn("w-10", TABLE_HEAD_CELL_CLASS)} />}
              <th className={TABLE_HEAD_CELL_CLASS}>Name</th>
              <th className={TABLE_HEAD_CELL_CLASS}>Contact</th>
              <th className={TABLE_HEAD_CELL_CLASS}>Country</th>
              <th className={TABLE_HEAD_CELL_CLASS}>Source</th>
              <th className={TABLE_HEAD_CELL_CLASS}>Status</th>
              <th className={TABLE_HEAD_CELL_CLASS}>Assigned to</th>
              <th className={TABLE_HEAD_CELL_CLASS}>Follow up</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l, i) => {
              const overdue = l.next_follow_up_at && DateTime.fromISO(l.next_follow_up_at) < now;
              return (
                <tr key={l.id} className={tableRowClass(i, overdue ? "!bg-red-50/70" : undefined)}>
                  {selectMode && (
                    <td className={TABLE_CELL_CLASS}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-primary-300"
                        checked={selected.has(l.id)}
                        onChange={() => toggleSelected(l.id)}
                        aria-label={`Select ${l.full_name}`}
                      />
                    </td>
                  )}
                  <td className={TABLE_CELL_CLASS}>
                    {selectMode ? (
                      <button type="button" className={`rounded font-medium text-primary-900 hover:underline ${FOCUS_RING}`} onClick={() => toggleSelected(l.id)}>
                        {l.full_name}
                      </button>
                    ) : (
                      <Link href={`/leads/${l.id}`} prefetch={false} className="font-medium text-primary-900 hover:underline">
                        {l.full_name}
                      </Link>
                    )}
                  </td>
                  <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>{l.email ?? l.phone ?? "—"}</td>
                  <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>{l.country ?? "—"}</td>
                  <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>{l.source ?? "—"}</td>
                  <td className={TABLE_CELL_CLASS}>
                    {l.status === "trial_scheduled" || l.status === "trial_completed" ? (
                      <span title="Set automatically by booking/completing a trial in Trial classes">
                        <Badge tone="accent">{l.status.replace("_", " ")}</Badge>
                      </span>
                    ) : (
                      <Select
                        value={l.status}
                        onChange={(e) => onStatusChange(l.id, e.target.value as LeadStatus)}
                        className="w-auto py-1 text-xs"
                      >
                        {MANUAL_STAGES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                    )}
                  </td>
                  <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>{assigneeById.get(l.assigned_to ?? "") ?? "—"}</td>
                  <td className={TABLE_CELL_CLASS}>
                    {l.next_follow_up_at ? (
                      <span className={overdue ? "font-medium text-red-600" : "text-slate-500"}>
                        {overdue ? "Overdue: " : ""}
                        {DateTime.fromISO(l.next_follow_up_at).toRelative()}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {leads.length === 0 && (
              <tr>
                <td colSpan={selectMode ? 8 : 7} className="px-4 py-10 text-center">
                  <EmptyState
                    compact
                    icon={UserPlus}
                    title={hasQuery ? "No leads match your search" : "No leads yet"}
                    description={hasQuery ? undefined : "Add a lead to start tracking prospective students."}
                    action={hasQuery ? undefined : <LinkButton href="/leads/new">Add lead</LinkButton>}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
