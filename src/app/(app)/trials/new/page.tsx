import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { Input, Label, Select } from "@/components/ui/input";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { Button } from "@/components/ui/button";
import { bookTrialClass } from "@/lib/actions/schedule";
import { PageHeader } from "@/components/ui/page-header";

export default async function NewTrialPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const { lead: leadId } = await searchParams;
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: leads }, { data: teachers }] = await Promise.all([
    supabase.from("leads").select("id, full_name, timezone").not("status", "in", "(converted,lost)"),
    supabase.from("teachers").select("id, profiles(full_name)").eq("active", true),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Book a trial class" backHref="/trials" backLabel="Back to Trial classes" />
      <form action={bookTrialClass} className="max-w-xl space-y-4">
        <div>
          <Label htmlFor="lead_id">Lead</Label>
          <Select id="lead_id" name="lead_id" defaultValue={leadId} required>
            {leads?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="teacher_id">Teacher</Label>
          <Select id="teacher_id" name="teacher_id" required>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(teachers as any[] | null)?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.profiles?.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="start_at_local">Date & time</Label>
          <Input id="start_at_local" name="start_at_local" type="datetime-local" required />
        </div>
        <div>
          <Label htmlFor="timezone">That time is in timezone</Label>
          <TimezoneSelect name="timezone" required />
        </div>
        <div>
          <Label htmlFor="duration_minutes">Duration</Label>
          <Select id="duration_minutes" name="duration_minutes" defaultValue="30">
            <option value="30">30 minutes</option>
            <option value="60">60 minutes</option>
          </Select>
        </div>
        <Button type="submit">Book trial</Button>
      </form>
    </div>
  );
}
