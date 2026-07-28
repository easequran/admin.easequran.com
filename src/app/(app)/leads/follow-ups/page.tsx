import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FollowUpBadge } from "@/components/leads/follow-up-badge";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { DateTime } from "luxon";

export default async function FollowUpsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .not("status", "in", "(converted,lost)")
    .not("next_follow_up_at", "is", null)
    .order("next_follow_up_at", { ascending: true });

  const now = DateTime.now();
  const overdue = (leads ?? []).filter((l) => DateTime.fromISO(l.next_follow_up_at!) < now);
  const today = (leads ?? []).filter(
    (l) => DateTime.fromISO(l.next_follow_up_at!) >= now && DateTime.fromISO(l.next_follow_up_at!).hasSame(now, "day"),
  );
  const upcoming = (leads ?? []).filter(
    (l) => DateTime.fromISO(l.next_follow_up_at!) >= now && !DateTime.fromISO(l.next_follow_up_at!).hasSame(now, "day"),
  );

  const sections: { title: string; items: typeof overdue }[] = [
    { title: "Overdue", items: overdue },
    { title: "Due today", items: today },
    { title: "Upcoming", items: upcoming },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        description="Leads sorted by who needs a call next."
        backHref="/leads"
        backLabel="Back to Leads"
      />

      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle>
              {section.title} ({section.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {section.items.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing here.</p>
            ) : (
              <ul className="divide-y divide-primary-50">
                {section.items.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <Link href={`/leads/${l.id}`} prefetch={false} className="font-medium text-primary-900 hover:underline">
                      {l.full_name}
                    </Link>
                    <FollowUpBadge nextFollowUpAt={l.next_follow_up_at} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
