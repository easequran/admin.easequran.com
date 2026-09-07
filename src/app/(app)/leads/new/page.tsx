import { Input, Label, Textarea } from "@/components/ui/input";
import { PhoneCountryTimezoneField } from "@/components/leads/phone-country-timezone-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "@/components/ui/action-form";
import { PageHeader } from "@/components/ui/page-header";
import { createLeadAction } from "@/lib/actions/form-actions";
import { requireAdmin } from "@/lib/data/profile";
import { UserPlus } from "lucide-react";

export default async function NewLeadPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <PageHeader title="Add lead" icon={UserPlus} tone="accent" backHref="/leads" backLabel="Back to Leads" />
      <ActionForm action={createLeadAction} className="max-w-xl space-y-4">
        <div>
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" />
        </div>
        <PhoneCountryTimezoneField />
        <div>
          <Label htmlFor="source">Source</Label>
          <Input id="source" name="source" placeholder="e.g. Facebook, referral, website" />
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={3} />
        </div>
        <SubmitButton pendingText="Adding...">Add lead</SubmitButton>
      </ActionForm>
    </div>
  );
}
