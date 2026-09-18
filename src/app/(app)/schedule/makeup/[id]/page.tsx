import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { SectionCard } from "@/components/ui/section-card";
import { Label, Select } from "@/components/ui/input";
import { DateTimeTimezoneFields } from "@/components/ui/datetime-timezone-fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { updateMakeupClass, deleteMakeupClass } from "@/lib/actions/schedule";
import { PageHeader } from "@/components/ui/page-header";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { CalendarClock } from "lucide-react";

export default async function EditMakeupClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: occurrence }, { data: teachers }] = await Promise.all([
    supabase
      .from("class_occurrences")
      .select("*, students(full_name, timezone)")
      .eq("id", id)
      .eq("is_trial", false)
      .is("recurring_schedule_id", null)
      .single(),
    supabase.from("teachers").select("id, profiles(full_name)").eq("active", true),
  ]);
  if (!occurrence) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const student = (occurrence as any).students;
  const timezone = student?.timezone ?? "UTC";
  const startLocal = DateTime.fromISO(occurrence.start_at, { zone: "utc" })
    .setZone(timezone)
    .toFormat("yyyy-LL-dd'T'HH:mm");
  const durationMinutes = Math.round(
    DateTime.fromISO(occurrence.end_at).diff(DateTime.fromISO(occurrence.start_at), "minutes").minutes,
  );

  const boundUpdate = updateMakeupClass.bind(null, id);
  const boundDelete = deleteMakeupClass.bind(null, id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit makeup class: ${student?.full_name ?? "Student"}`}
        icon={CalendarClock}
        tone="warning"
        backHref="/schedule"
        backLabel="Back to Schedule"
        actions={
          <ConfirmButton
            action={boundDelete}
            title="Delete this makeup class?"
            confirmText="Delete makeup class"
            errorToast="Failed to delete makeup class"
            body="This removes the makeup booking entirely, along with its calendar invite. This can't be undone."
          >
            Delete makeup class
          </ConfirmButton>
        }
      />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <SectionCard icon={CalendarClock} tone="warning" title="Makeup class details">
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
