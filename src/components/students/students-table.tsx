"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Users, Download } from "lucide-react";
import { DateTime } from "luxon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { downloadCsv } from "@/lib/utils/csv";
import { FOCUS_RING } from "@/lib/utils/focus";
import { bulkUpdateStudentStatus } from "@/lib/actions/students";
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
// Trials/Leads pipeline, not the Students list, so offering it here would
// just make a bulk-selected student disappear from view.
const STATUSES: EnrollmentStatus[] = ["active", "paused", "inactive"];

export function StudentsTable({
  students,
  teacherByStudent = {},
}: {
  students: Student[];
  teacherByStudent?: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<EnrollmentStatus>("active");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.full_name, s.country, s.guardian_name, s.guardian_email, s.timezone, teacherByStudent[s.id]]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }, [students, query, teacherByStudent]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((s) => s.id))));
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

  function handleExportCsv() {
    const rows = students.filter((s) => selected.has(s.id));
    downloadCsv(
      `students-${DateTime.now().toFormat("yyyy-LL-dd")}.csv`,
      [
        { key: "full_name", label: "Full name" },
        { key: "timezone", label: "Timezone" },
        { key: "country", label: "Country" },
        { key: "enrollment_status", label: "Status" },
        { key: "guardian_name", label: "Guardian name" },
        { key: "guardian_email", label: "Guardian email" },
        { key: "guardian_phone", label: "Guardian phone" },
        { key: "created_at", label: "Created at" },
      ],
      rows,
    );
  }

  if (students.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Users}
          title="No students yet"
          description="Add your first student to start scheduling classes."
          action={<LinkButton href="/students/new">Add student</LinkButton>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Search students..." />
        </div>
        <Button variant={selectMode ? "outline" : "ghost"} size="sm" onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}>
          {selectMode ? "Cancel selection" : "Select"}
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

          <Button size="sm" variant="outline" onClick={handleExportCsv} disabled={selected.size === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>

          <span className="ml-auto text-xs text-slate-500">
            <button type="button" onClick={toggleAll} className={`rounded underline hover:text-primary-700 ${FOCUS_RING}`}>
              {selected.size === filtered.length ? "Deselect all" : "Select all"}
            </button>
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
              {filtered.map((s, i) => (
                <tr key={s.id} className={tableRowClass(i)}>
                  {selectMode && (
                    <td className={TABLE_CELL_CLASS}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-primary-300"
                        checked={selected.has(s.id)}
                        onChange={() => toggleSelected(s.id)}
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={selectMode ? 7 : 6} className="px-4 py-8 text-center text-slate-400">
                    No students match &quot;{query}&quot;.
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
