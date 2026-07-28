import { Input, Label, Textarea } from "@/components/ui/input";
import { PhoneCountryTimezoneField } from "@/components/leads/phone-country-timezone-field";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { createLead } from "@/lib/actions/leads";
import { requireAdmin } from "@/lib/data/profile";

export default async function NewLeadPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <PageHeader title="Add lead" backHref="/leads" backLabel="Back to Leads" />
      <form action={createLead} className="max-w-xl space-y-4">
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
        <Button type="submit">Add lead</Button>
      </form>
    </div>
  );
}
