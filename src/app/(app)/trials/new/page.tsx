import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { Label, Select } from "@/components/ui/input";
import { FutureDateTimeInput } from "@/components/ui/future-datetime-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "@/components/ui/action-form";
import { bookTrialAction } from "@/lib/actions/form-actions";
import { PageHeader } from "@/components/ui/page-header";
import { LeadTimezoneFields } from "@/components/trials/lead-timezone-fields";
import { CalendarPlus } from "lucide-react";

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
      <PageHeader title="Book a trial class" icon={CalendarPlus} tone="accent" backHref="/trials" backLabel="Back to Trial classes" />
      <ActionForm action={bookTrialAction} className="max-w-xl space-y-4">
        <LeadTimezoneFields leads={leads ?? []} defaultLeadId={leadId} />
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
          <FutureDateTimeInput id="start_at_local" name="start_at_local" required />
        </div>
        <div>
          <Label htmlFor="duration_minutes">Duration</Label>
          <Select id="duration_minutes" name="duration_minutes" defaultValue="30">
            <option value="30">30 minutes</option>
            <option value="60">60 minutes</option>
          </Select>
        </div>
        <SubmitButton pendingText="Booking…">Book trial</SubmitButton>
      </ActionForm>
    </div>
  );
}
