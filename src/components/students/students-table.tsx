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
import { bulkUpdateStudentStatus } from "@/lib/actions/students";
import type { EnrollmentStatus, Student } from "@/lib/types/database";

const statusTone = {
  trial: "accent",
  active: "success",
  paused: "warning",
  inactive: "neutral",
} as const;

const STATUSES: EnrollmentStatus[] = ["trial", "active", "paused", "inactive"];

export function StudentsTable({ students }: { students: Student[] }) {
  const [query, setQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<EnrollmentStatus>("active");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.full_name, s.country, s.guardian_name, s.guardian_email, s.timezone]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }, [students, query]);

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
            <button type="button" onClick={toggleAll} className="underline hover:text-primary-700">
              {selected.size === filtered.length ? "Deselect all" : "Select all"}
            </button>
          </span>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-primary-50 text-left text-xs uppercase text-primary-500">
              <tr>
                {selectMode && <th className="w-10 px-5 py-3" />}
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Timezone</th>
                <th className="px-5 py-3">Country</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Guardian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  {selectMode && (
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-primary-300"
                        checked={selected.has(s.id)}
                        onChange={() => toggleSelected(s.id)}
                      />
                    </td>
                  )}
                  <td className="px-5 py-3">
                    {selectMode ? (
                      <button type="button" className="font-medium text-primary-900 hover:underline" onClick={() => toggleSelected(s.id)}>
                        {s.full_name}
                      </button>
                    ) : (
                      <Link href={`/students/${s.id}`} prefetch={false} className="font-medium text-primary-900 hover:underline">
                        {s.full_name}
                      </Link>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{s.timezone}</td>
                  <td className="px-5 py-3 text-slate-600">{s.country ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge tone={statusTone[s.enrollment_status]}>{s.enrollment_status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{s.guardian_name ?? "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={selectMode ? 6 : 5} className="px-5 py-8 text-center text-slate-400">
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
