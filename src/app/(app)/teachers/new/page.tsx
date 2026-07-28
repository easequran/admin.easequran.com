import { Input, Label } from "@/components/ui/input";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { createTeacher } from "@/lib/actions/teachers";
import { requireAdmin } from "@/lib/data/profile";

export default async function NewTeacherPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <PageHeader title="Add teacher" backHref="/teachers" backLabel="Back to Teachers" />
      <form action={createTeacher} className="max-w-xl space-y-4">
        <div>
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
          <p className="mt-1 text-xs text-slate-400">
            They&apos;ll receive an invite email to set their password.
          </p>
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <TimezoneSelect name="timezone" defaultValue="Asia/Karachi" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="hourly_rate">Hourly rate</Label>
            <Input id="hourly_rate" name="hourly_rate" type="number" step="0.01" defaultValue={450} />
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" name="currency" defaultValue="PKR" />
          </div>
        </div>
        <Button type="submit">Send invite</Button>
      </form>
    </div>
  );
}
