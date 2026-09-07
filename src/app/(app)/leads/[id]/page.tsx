import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { PhoneCountryTimezoneField } from "@/components/leads/phone-country-timezone-field";
import { FollowUpBadge } from "@/components/leads/follow-up-badge";
import { LogContactForm } from "@/components/leads/log-contact-form";
import { updateLead, updateLeadStatus, logLeadContact, deleteLead } from "@/lib/actions/leads";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils/cn";
import { notFound } from "next/navigation";
import type { LeadStatus } from "@/lib/types/database";
import { DateTime } from "luxon";
import { Target } from "lucide-react";

// Clickable pipeline-stage chips: real pointer + hover ring + keyboard focus
// ring so it's obvious they're actionable; the current stage also carries a
// permanent accent ring and aria-current.
const STAGE_INTERACTIVE =
  "cursor-pointer rounded-full outline-none transition hover:ring-2 hover:ring-primary-300 focus-visible:ring-2 focus-visible:ring-primary-500";
const STAGE_CURRENT = "ring-2 ring-accent-500 ring-offset-1";

const STATUS_FLOW: LeadStatus[] = [
  "new",
  "contacted",
  "trial_scheduled",
  "trial_completed",
  "converted",
  "lost",
];

const OUTCOME_LABELS: Record<string, string> = {
  interested: "Interested",
  not_interested: "Not interested",
  no_answer: "No answer",
  voicemail: "Left voicemail",
  callback_requested: "Asked to call back",
  converted: "Ready to convert",
  other: "Other",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: lead }, { data: activities }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).single(),
    supabase.from("lead_activities").select("*, profiles(full_name)").eq("lead_id", id).order("created_at", { ascending: false }),
  ]);
  if (!lead) notFound();

  const boundLogContact = logLeadContact.bind(null, id);
  const boundUpdate = updateLead.bind(null, id);
  const boundDelete = deleteLead.bind(null, id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={lead.full_name}
        icon={Target}
        tone="accent"
        description={`${lead.email ?? "No email"} · ${lead.phone ?? "No phone"}`}
        backHref="/leads"
        backLabel="Back to Leads"
        actions={
          <>
            <LinkButton href={`/trials/new?lead=${lead.id}`} variant="accent">
              Book trial
            </LinkButton>
            {lead.status !== "converted" ? (
              <LinkButton href={`/leads/${lead.id}/convert`} variant="primary">
                Convert to student
              </LinkButton>
            ) : (
              lead.converted_student_id && (
                <LinkButton href={`/students/${lead.converted_student_id}`} variant="primary">
                  View student
                </LinkButton>
              )
            )}
            <ConfirmButton
              action={boundDelete}
              size="md"
              title="Delete this lead?"
              confirmText="Delete lead"
              errorToast="Failed to delete lead"
              body={
                <>
                  <strong className="font-semibold text-primary-900">{lead.full_name}</strong> and
                  their full contact history (calls, messages, notes, status changes) will be
                  permanently removed. Any trial classes already booked for them are kept. This
                  cannot be undone.
                </>
              }
            >
              Delete lead
            </ConfirmButton>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <FollowUpBadge nextFollowUpAt={lead.next_follow_up_at} />
        {lead.last_contacted_at && (
          <span className="text-xs text-slate-400">
            Last contacted {DateTime.fromISO(lead.last_contacted_at).toRelative()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline stage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Lead pipeline stage">
                {STATUS_FLOW.map((s) => {
                  const isCurrent = lead.status === s;
                  const label = s.replace("_", " ");

                  if (s === "converted") {
                    const href = lead.converted_student_id
                      ? `/students/${lead.converted_student_id}`
                      : `/leads/${id}/convert`;
                    return (
                      <a
                        key={s}
                        href={href}
                        aria-current={isCurrent ? "step" : undefined}
                        title={isCurrent ? "Current stage — open the student record" : "Convert this lead to a student"}
                        className={cn(STAGE_INTERACTIVE, isCurrent && STAGE_CURRENT)}
                      >
                        <Badge tone={isCurrent ? "accent" : "neutral"}>converted</Badge>
                      </a>
                    );
                  }

                  // These two only ever move via an actual trial (booked in
                  // Trials, completed from the Trials list) -- letting admin
                  // click straight to "trial completed" here let leads sit
                  // in that stage with no trial ever having happened.
                  if (s === "trial_scheduled" || s === "trial_completed") {
                    return (
                      <span
                        key={s}
                        aria-current={isCurrent ? "step" : undefined}
                        title="Set automatically when a trial is booked or completed in Trial classes"
                        className={cn("cursor-default rounded-full", isCurrent ? STAGE_CURRENT : "opacity-70")}
                      >
                        <Badge tone={isCurrent ? "accent" : "neutral"}>{label}</Badge>
                      </span>
                    );
                  }

                  const boundSet = async () => {
                    "use server";
                    await updateLeadStatus(id, s);
                  };
                  return (
                    <form key={s} action={boundSet}>
                      <button
                        type="submit"
                        aria-current={isCurrent ? "step" : undefined}
                        aria-label={isCurrent ? `Current stage: ${label}` : `Move lead to ${label}`}
                        title={isCurrent ? "Current stage" : `Move lead to "${label}"`}
                        className={cn(STAGE_INTERACTIVE, isCurrent && STAGE_CURRENT)}
                      >
                        <Badge tone={isCurrent ? "accent" : "neutral"}>{label}</Badge>
                      </button>
                    </form>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Log a call, message, or follow-up</CardTitle>
            </CardHeader>
            <CardContent>
              <LogContactForm action={boundLogContact} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {activities?.map((a) => (
                  <li key={a.id} className="rounded-lg bg-primary-50 px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium capitalize text-primary-900">{a.activity_type}</span>
                      {a.outcome && <Badge tone="accent">{OUTCOME_LABELS[a.outcome] ?? a.outcome}</Badge>}
                    </div>
                    {a.content && <p className="mt-1 text-primary-800">{a.content}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      {a.profiles?.full_name ?? "System"} · {DateTime.fromISO(a.created_at).toRelative()}
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
          <CardContent>
            <form action={boundUpdate} className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" name="full_name" required defaultValue={lead.full_name} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={lead.email ?? ""} />
              </div>
              <PhoneCountryTimezoneField
                defaultPhone={lead.phone ?? ""}
                defaultCountry={lead.country ?? ""}
                defaultTimezone={lead.timezone ?? "UTC"}
              />
              <div>
                <Label htmlFor="source">Source</Label>
                <Input id="source" name="source" defaultValue={lead.source ?? ""} />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={3} defaultValue={lead.notes ?? ""} />
              </div>
              <Button type="submit">Save changes</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
