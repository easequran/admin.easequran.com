import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function TeachersPage() {
  const supabase = await createClient();
  const { data: teachers } = await supabase
    .from("teachers")
    .select("*, profiles(full_name, email, timezone)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary-900">Teachers</h1>
        <LinkButton href="/teachers/new">Add teacher</LinkButton>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
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
            {teachers?.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <Link href={`/teachers/${t.id}`} className="font-medium text-primary-900 hover:underline">
                    {t.profiles?.full_name}
                  </Link>
                </td>
                <td className="px-5 py-3 text-slate-600">{t.profiles?.email}</td>
                <td className="px-5 py-3 text-slate-600">{t.profiles?.timezone}</td>
                <td className="px-5 py-3 text-slate-600">
                  {t.hourly_rate ? `${t.currency} ${t.hourly_rate}/hr` : "—"}
                </td>
                <td className="px-5 py-3">
                  <Badge tone={t.active ? "success" : "neutral"}>{t.active ? "Active" : "Inactive"}</Badge>
                </td>
              </tr>
            ))}
            {(!teachers || teachers.length === 0) && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                  No teachers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
