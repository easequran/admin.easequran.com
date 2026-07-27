import { Input, Label, Textarea } from "@/components/ui/input";
import { PhoneCountryTimezoneField } from "@/components/leads/phone-country-timezone-field";
import { Button } from "@/components/ui/button";
import { createLead } from "@/lib/actions/leads";

export default function NewLeadPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-primary-900">Add lead</h1>
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
