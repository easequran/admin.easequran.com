import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { SectionCard } from "@/components/ui/section-card";
import { Input, Label, Select } from "@/components/ui/input";
import { DateTimeTimezoneFields } from "@/components/ui/datetime-timezone-fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { LinkButton } from "@/components/ui/button";
import { updateTrialClass, cancelTrialClass } from "@/lib/actions/schedule";
import { DeleteTrialButton } from "@/components/schedule/delete-trial-button";
import { PageHeader } from "@/components/ui/page-header";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { CalendarClock, AlertTriangle } from "lucide-react";

export default async function EditTrialPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const profile = await requireAdmin();
  const supabase = await createClient();

  const [{ data: occurrence }, { data: teachers }] = await Promise.all([
    supabase.from("class_occurrences").select("*, leads(full_name, timezone)").eq("id", id).eq("is_trial", true).single(),
    supabase.from("teachers").select("id, profiles(full_name)").eq("active", true),
  ]);
  if (!occurrence) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lead = (occurrence as any).leads;
  const timezone = lead?.timezone || profile.timezone;
  const startLocal = DateTime.fromISO(occurrence.start_at, { zone: "utc" })
    .setZone(timezone)
    .toFormat("yyyy-LL-dd'T'HH:mm");
  const durationMinutes = Math.round(
    DateTime.fromISO(occurrence.end_at).diff(DateTime.fromISO(occurrence.start_at), "minutes").minutes,
  );

  const boundUpdate = updateTrialClass.bind(null, id);
  const boundCancel = cancelTrialClass.bind(null, id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit trial: ${lead?.full_name ?? "Trial"}`}
        icon={CalendarClock}
        tone="accent"
        backHref="/trials"
        backLabel="Back to Trial classes"
        actions={
          occurrence.status === "scheduled" ? (
            <>
              <ConfirmButton
                action={boundCancel}
                variant="outline"
                title="Cancel this trial class?"
                confirmText="Cancel trial"
                confirmingText="Cancelling…"
                errorToast="Failed to cancel trial"
                body={
                  <>
                    The booking is marked cancelled and its calendar invite is removed. Unless the lead
                    is already converted, they&apos;re moved to the &quot;lost&quot; stage. The record stays
                    in the trials list, and you can book a new trial for them afterwards.
                  </>
                }
              >
                Cancel trial
              </ConfirmButton>
              <DeleteTrialButton occurrenceId={id} />
            </>
          ) : (
            <DeleteTrialButton occurrenceId={id} />
          )
        }
      />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!occurrence.teacher_id && (
        <div className="flex flex-wrap items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="font-medium text-amber-900">No teacher assigned yet</p>
            <p className="mt-0.5 text-amber-800">
              {occurrence.pending_teacher_name
                ? `Confirmed with ${occurrence.pending_teacher_name}, who isn't added to the app yet.`
                : "Pick a teacher below once one is confirmed."}
            </p>
          </div>
          <LinkButton href="/teachers/new" variant="outline" size="sm">
            Add teacher
          </LinkButton>
        </div>
      )}

      <SectionCard icon={CalendarClock} tone="accent" title="Trial details">
          <form action={boundUpdate} className="max-w-xl space-y-4">
            <div>
              <Label htmlFor="teacher_id">Teacher</Label>
              <Select id="teacher_id" name="teacher_id" defaultValue={occurrence.teacher_id ?? ""}>
                <option value="">Not decided yet</option>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {((teachers ?? []) as any[]).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.profiles?.full_name ?? "Unnamed"}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="pending_teacher_name">Confirmed teacher, not added to the app yet?</Label>
              <Input
                id="pending_teacher_name"
                name="pending_teacher_name"
                placeholder="Their name (optional)"
                defaultValue={occurrence.pending_teacher_name ?? ""}
              />
              <p className="mt-1 text-xs text-slate-500">
                Only used when &quot;Teacher&quot; above is left as &quot;Not decided yet&quot;.
              </p>
            </div>
            <DateTimeTimezoneFields
              dateTimeId="start_at_local"
              dateTimeName="start_at_local"
              defaultDateTime={startLocal}
              timezoneName="timezone"
              defaultTimezone={timezone}
            />
            <div>
              <Label htmlFor="duration_minutes">Duration</Label>
              <Select id="duration_minutes" name="duration_minutes" defaultValue={String(durationMinutes)}>
                <option value="30">30 minutes</option>
                <option value="60">60 minutes</option>
              </Select>
            </div>
            <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
          </form>
      </SectionCard>
    </div>
  );
}
