import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Student } from "@/lib/types/database";

const statusTone = {
  trial: "accent",
  active: "success",
  paused: "warning",
  inactive: "neutral",
} as const;

export default async function StudentsPage() {
  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary-900">Students</h1>
        <LinkButton href="/students/new">Add student</LinkButton>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
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
            {(students as Student[] | null)?.map((s) => (
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
            {!students ||
              (students.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    No students yet.
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
