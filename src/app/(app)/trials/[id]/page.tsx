import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { SectionCard } from "@/components/ui/section-card";
import { Label, Select } from "@/components/ui/input";
import { FutureDateTimeInput } from "@/components/ui/future-datetime-input";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { updateTrialClass, cancelTrialClass } from "@/lib/actions/schedule";
import { DeleteTrialButton } from "@/components/schedule/delete-trial-button";
import { PageHeader } from "@/components/ui/page-header";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { CalendarClock } from "lucide-react";

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
            <ConfirmButton
              action={boundCancel}
              title="Cancel this trial class?"
              confirmText="Cancel trial"
              confirmingText="Cancelling…"
              errorToast="Failed to cancel trial"
              body={
                <>
                  The booking is marked cancelled and its calendar invite is removed. Unless the lead
                  is already converted, they&apos;re moved to the &quot;lost&quot; stage. You can
                  book a new trial for them afterwards.
                </>
              }
            >
              Cancel trial
            </ConfirmButton>
          ) : (
            <DeleteTrialButton occurrenceId={id} />
          )
        }
      />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <SectionCard icon={CalendarClock} tone="accent" title="Trial details">
          <form action={boundUpdate} className="max-w-xl space-y-4">
            <div>
              <Label htmlFor="teacher_id">Teacher</Label>
              <Select id="teacher_id" name="teacher_id" defaultValue={occurrence.teacher_id} required>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {((teachers ?? []) as any[]).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.profiles?.full_name ?? "Unnamed"}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="start_at_local">Date & time</Label>
              <FutureDateTimeInput
                id="start_at_local"
                name="start_at_local"
                defaultValue={startLocal}
                required
              />
            </div>
            <div>
              <Label htmlFor="timezone">That time is in timezone</Label>
              <TimezoneSelect name="timezone" defaultValue={timezone} required />
            </div>
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
