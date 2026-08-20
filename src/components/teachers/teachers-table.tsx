"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";

export interface TeacherRow {
  id: string;
  fullName: string;
  email: string | null;
  timezone: string | null;
  hourlyRate: number | null;
  currency: string;
  active: boolean;
}

export function TeachersTable({ teachers }: { teachers: TeacherRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) =>
      [t.fullName, t.email, t.timezone].filter(Boolean).some((field) => field!.toLowerCase().includes(q)),
    );
  }, [teachers, query]);

  if (teachers.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={GraduationCap}
          title="No teachers yet"
          description="Invite your first teacher to start assigning classes."
          action={<LinkButton href="/teachers/new">Add teacher</LinkButton>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search teachers..." />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-primary-50 text-left text-xs uppercase text-primary-500">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Timezone</th>
                <th className="px-5 py-3">Rate</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/teachers/${t.id}`} prefetch={false} className="font-medium text-primary-900 hover:underline">
                      {t.fullName}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{t.email}</td>
                  <td className="px-5 py-3 text-slate-600">{t.timezone}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {t.hourlyRate ? `${t.currency} ${t.hourlyRate}/hr` : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={t.active ? "success" : "neutral"}>{t.active ? "Active" : "Inactive"}</Badge>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    No teachers match &quot;{query}&quot;.
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
