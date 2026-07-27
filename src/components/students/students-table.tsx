"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import type { Student } from "@/lib/types/database";

const statusTone = {
  trial: "accent",
  active: "success",
  paused: "warning",
  inactive: "neutral",
} as const;

export function StudentsTable({ students }: { students: Student[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.full_name, s.country, s.guardian_name, s.guardian_email, s.timezone]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }, [students, query]);

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
      <SearchInput value={query} onChange={setQuery} placeholder="Search students..." />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-primary-50 text-left text-xs uppercase text-primary-500">
              <tr>
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
                  <td className="px-5 py-3">
                    <Link href={`/students/${s.id}`} prefetch={false} className="font-medium text-primary-900 hover:underline">
                      {s.full_name}
                    </Link>
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
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
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
