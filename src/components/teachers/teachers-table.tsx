"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableSearch } from "@/components/ui/table-search";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import {
  TABLE_ELEMENT_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_HEAD_CELL_CLASS,
  TABLE_CELL_CLASS,
  TABLE_CELL_SECONDARY_CLASS,
  tableRowClass,
} from "@/lib/utils/table-styles";
import { cn } from "@/lib/utils/cn";

export interface TeacherRow {
  id: string;
  fullName: string;
  email: string | null;
  timezone: string | null;
  hourlyRate: number | null;
  currency: string;
  active: boolean;
}

export function TeachersTable({ teachers, hasQuery = false }: { teachers: TeacherRow[]; hasQuery?: boolean }) {
  const noneAtAll = teachers.length === 0 && !hasQuery;

  return (
    <div className="space-y-4">
      <TableSearch placeholder="Search teachers by name or email…" />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className={cn(TABLE_ELEMENT_CLASS, "min-w-[640px]")}>
            <thead className={TABLE_HEAD_CLASS}>
              <tr>
                <th className={TABLE_HEAD_CELL_CLASS}>Name</th>
                <th className={TABLE_HEAD_CELL_CLASS}>Email</th>
                <th className={TABLE_HEAD_CELL_CLASS}>Timezone</th>
                <th className={TABLE_HEAD_CELL_CLASS}>Rate</th>
                <th className={TABLE_HEAD_CELL_CLASS}>Status</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t, i) => (
                <tr key={t.id} className={tableRowClass(i)}>
                  <td className={TABLE_CELL_CLASS}>
                    <Link href={`/teachers/${t.id}`} prefetch={false} className="font-medium text-primary-900 hover:underline">
                      {t.fullName}
                    </Link>
                  </td>
                  <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>{t.email ?? "—"}</td>
                  <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>{t.timezone ?? "—"}</td>
                  <td className={cn(TABLE_CELL_CLASS, TABLE_CELL_SECONDARY_CLASS)}>
                    {t.hourlyRate ? `${t.currency} ${t.hourlyRate}/hr` : "—"}
                  </td>
                  <td className={TABLE_CELL_CLASS}>
                    <Badge tone={t.active ? "success" : "neutral"}>{t.active ? "Active" : "Inactive"}</Badge>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <EmptyState
                      compact
                      icon={GraduationCap}
                      title={noneAtAll ? "No teachers yet" : "No teachers match your search"}
                      description={noneAtAll ? "Invite your first teacher to start assigning classes." : undefined}
                      action={noneAtAll ? <LinkButton href="/teachers/new">Add teacher</LinkButton> : undefined}
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
