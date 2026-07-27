import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { updateLeadStatus, addLeadNote, convertLeadToStudent } from "@/lib/actions/leads";
import { notFound } from "next/navigation";
import type { LeadStatus } from "@/lib/types/database";
import { DateTime } from "luxon";

const STATUS_FLOW: LeadStatus[] = [
  "new",
  "contacted",
  "trial_scheduled",
  "trial_completed",
  "converted",
  "lost",
];

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).single();
  if (!lead) notFound();

  const { data: activities } = await supabase
    .from("lead_activities")
    .select("*, profiles(full_name)")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  const boundAddNote = addLeadNote.bind(null, id);
  const boundConvert = convertLeadToStudent.bind(null, id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-900">{lead.full_name}</h1>
          <p className="text-sm text-slate-500">{lead.email ?? "No email"} · {lead.phone ?? "No phone"}</p>
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/trials/new?lead=${lead.id}`} variant="accent">
            Book trial
          </LinkButton>
          {lead.status !== "converted" && (
            <form action={boundConvert}>
              <Button type="submit" variant="primary">
                Convert to student
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline stage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {STATUS_FLOW.map((s) => {
                  const boundSet = async () => {
                    "use server";
                    await updateLeadStatus(id, s);
                  };
                  return (
                    <form key={s} action={boundSet}>
                      <button type="submit">
                        <Badge tone={lead.status === s ? "accent" : "neutral"}>{s.replace("_", " ")}</Badge>
                      </button>
                    </form>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={boundAddNote} className="space-y-2">
                <Textarea name="content" rows={2} placeholder="Add a note or call summary..." />
                <Button type="submit" size="sm">
                  Add note
                </Button>
              </form>

              <ul className="space-y-3">
                {activities?.map((a) => (
                  <li key={a.id} className="rounded-lg bg-primary-50 px-3 py-2 text-sm">
                    <p className="text-primary-900">{a.content}</p>
                    <p className="text-xs text-slate-400">
                      {a.profiles?.full_name ?? "System"} ·{" "}
                      {DateTime.fromISO(a.created_at).toRelative()}
                    </p>
                  </li>
                ))}
                {(!activities || activities.length === 0) && (
                  <p className="text-sm text-slate-500">No activity yet.</p>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-slate-500">Country:</span> {lead.country ?? "—"}
            </p>
            <p>
              <span className="text-slate-500">Timezone:</span> {lead.timezone ?? "—"}
            </p>
            <p>
              <span className="text-slate-500">Source:</span> {lead.source ?? "—"}
            </p>
            <p>
              <span className="text-slate-500">Notes:</span> {lead.notes ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
