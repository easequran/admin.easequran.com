"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Users, Download, ListChecks } from "lucide-react";
import { DateTime } from "luxon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { TableSearch } from "@/components/ui/table-search";
import { EmptyState } from "@/components/ui/empty-state";
import { downloadCsv } from "@/lib/utils/csv";
import { FOCUS_RING } from "@/lib/utils/focus";
import { bulkUpdateStudentStatus } from "@/lib/actions/students";
import { exportStudentsCsv } from "@/lib/actions/exports";
import { toast } from "@/lib/toast";
import type { EnrollmentStatus, Student } from "@/lib/types/database";
import {
  TABLE_ELEMENT_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_HEAD_CELL_CLASS,
  TABLE_CELL_CLASS,
  TABLE_CELL_SECONDARY_CLASS,
  tableRowClass,
} from "@/lib/utils/table-styles";
import { cn } from "@/lib/utils/cn";

const statusTone = {
  trial: "accent",
  active: "success",
  paused: "warning",
  inactive: "neutral",
} as const;

// "trial" is intentionally excluded -- trial students live in the
// Trials/Leads pipeline, not the Students list.
const STATUSES: EnrollmentStatus[] = ["active", "paused", "inactive"];

const CSV_COLUMNS = [
  { key: "full_name", label: "Full name" },
  { key: "timezone", label: "Timezone" },
  { key: "country", label: "Country" },
  { key: "enrollment_status", label: "Status" },
  { key: "guardian_name", label: "Guardian name" },
  { key: "guardian_email", label: "Guardian email" },
  { key: "guardian_phone", label: "Guardian phone" },
  { key: "created_at", label: "Created at" },
] as const;

export function StudentsTable({
  students,
  teacherByStudent = {},
  query = "",
  totalMatching = 0,
}: {
  students: Student[];
  teacherByStudent?: Record<string, string>;
  /** Current `?q=` value (server already filtered/paged these `students`). */
  query?: string;
  /** Total rows matching the search across all pages. */
  totalMatching?: number;
}) {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<EnrollmentStatus>("active");
  const [isPending, startTransition] = useTransition();
  const [isExporting, startExport] = useTransition();

  const allPageSelected = students.length > 0 && selected.size === students.length;

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => (prev.size === students.length ? new Set() : new Set(students.map((s) => s.id))));
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  function handleApplyStatus() {
    const ids = Array.from(selected);
    startTransition(async () => {
      await bulkUpdateStudentStatus(ids, bulkStatus);
      toast.success(`Updated ${ids.length} student${ids.length === 1 ? "" : "s"} to ${bulkStatus}`);
      exitSelectMode();
    });
  }

  function handleExportSelected() {
    const rows = students.filter((s) => selected.has(s.id));
    downloadCsv(`students-selected-${DateTime.now().toFormat("yyyy-LL-dd")}.csv`, [...CSV_COLUMNS], rows);
  }

  function handleExportAll() {
    startExport(async () => {
      try {
        const rows = await exportStudentsCsv(query);
        downloadCsv(`students-${DateTime.now().toFormat("yyyy-LL-dd")}.csv`, [...CSV_COLUMNS], rows);
        toast.success(`Exported ${rows.length} student${rows.length === 1 ? "" : "s"}`);
      } catch {
        toast.error("Export failed");
      }
    });
  }

  const noneAtAll = students.length === 0 && !query;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <TableSearch placeholder="Search students by name, country, guardian…" />
        </div>
        <Button size="sm" variant="outline" onClick={handleExportAll} disabled={isExporting}>
          <Download className="h-4 w-4" />
          {isExporting ? "Exporting…" : query ? `Export all matching (${totalMatching})` : "Export all"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
        >
          <ListChecks className="h-4 w-4" />
          {selectMode ? "Cancel selection" : "Select rows"}
        </Button>
      </div>

      {selectMode && (
        <Card className="flex flex-wrap items-center gap-3 border-accent-300 bg-accent-50 p-3">
          <span className="text-sm font-medium text-primary-900">{selected.size} selected</span>

          <div className="flex items-center gap-2">
            <Select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as EnrollmentStatus)} className="w-auto">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Button size="sm" onClick={handleApplyStatus} disabled={selected.size === 0 || isPending}>
              Set status
            </Button>
          </div>

          <Button size="sm" variant="outline" onClick={handleExportSelected} disabled={selected.size === 0}>
            <Download className="h-4 w-4" /> Export selected
          </Button>

          <button
            type="button"
            onClick={togglePage}
            className={cn("rounded text-xs font-medium text-primary-700 underline hover:text-primary-900", FOCUS_RING)}
          >
            {allPageSelected ? "Deselect page" : "Select this page"}
          </button>

          <span className="ml-auto w-full text-xs text-slate-500 sm:w-auto">
            Selection and bulk actions apply only to the students shown on this page.
          </span>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className={cn(TABLE_ELEMENT_CLASS, "min-w-[640px]")}>
            <thead className={TABLE_HEAD_CLASS}>
              <tr>
                {selectMode && <th className={cn("w-10", TABLE_HEAD_CELL_CLASS)} />}
                <th className={TABLE_HEAD_CELL_CLASS}>Name</th>
                <th className={TABLE_HEAD_CELL_CLASS}>Teacher</th>
                <th className={TABLE_HEAD_CELL_CLASS}>Timezone</th>
                <th className={TABLE_HEAD_CELL_CLASS}>Country</th>
                <th className={TABLE_HEAD_CELL_CLASS}>Status</th>
                <th className={TABLE_HEAD_CELL_CLASS}>Guardian</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id} className={tableRowClass(i)}>
                  {selectMode && (
                    <td className={TABLE_CELL_CLASS}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-primary-300"
                        checked={selected.has(s.id)}
                        onChange={() => toggleSelected(s.id)}
                        aria-label={`Select ${s.full_name}`}
                      />
                    </td>
                  )}
                  <td className={TABLE_CELL_CLASS}>
                    {selectMode ? (
                      <button type="button" className={`rounded font-medium text-primary-900 hover:underline ${FOCUS_RING}`} onClick={() => toggleSelected(s.id)}>
                        {s.full_name}
                      </button>
                    ) : (
                      <Link href={`/students/${s.id}`} prefetch={false} className="font-medium text-primary-900 hover:underline">
                        {s.full_name}
                      </Link>
                    )}
                  </td>
                  <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>{teacherByStudent[s.id] ?? "—"}</td>
                  <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>{s.timezone}</td>
                  <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>{s.country ?? "—"}</td>
                  <td className={TABLE_CELL_CLASS}>
                    <Badge tone={statusTone[s.enrollment_status]}>{s.enrollment_status}</Badge>
                  </td>
                  <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>{s.guardian_name ?? "—"}</td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={selectMode ? 7 : 6} className="px-4 py-10 text-center">
                    <EmptyState
                      compact
                      icon={Users}
                      title={noneAtAll ? "No students yet" : "No students match your search"}
                      description={
                        noneAtAll ? "Add your first student to start scheduling classes." : undefined
                      }
                      action={
                        noneAtAll ? <LinkButton href="/students/new">Add student</LinkButton> : undefined
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
