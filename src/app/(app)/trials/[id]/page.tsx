import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { Button } from "@/components/ui/button";
import { updateTrialClass, cancelTrialClass } from "@/lib/actions/schedule";
import { PageHeader } from "@/components/ui/page-header";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";

export default async function EditTrialPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: occurrence } = await supabase
    .from("class_occurrences")
    .select("*, leads(full_name, timezone)")
    .eq("id", id)
    .eq("is_trial", true)
    .single();
  if (!occurrence) notFound();

  const { data: teachers } = await supabase
    .from("teachers")
    .select("id, profiles(full_name)")
    .eq("active", true);

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
        backHref="/trials"
        backLabel="Back to Trial classes"
        actions={
          <form action={boundCancel}>
            <Button type="submit" variant="danger" size="sm">
              Cancel trial
            </Button>
          </form>
        }
      />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Trial details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={boundUpdate} className="max-w-xl space-y-4">
            <div>
              <Label htmlFor="teacher_id">Teacher</Label>
              <Select id="teacher_id" name="teacher_id" defaultValue={occurrence.teacher_id} required>
                {teachers?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {/* @ts-expect-error joined shape */}
                    {t.profiles?.full_name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="start_at_local">Date & time</Label>
              <Input
                id="start_at_local"
                name="start_at_local"
                type="datetime-local"
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
            <Button type="submit">Save changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
