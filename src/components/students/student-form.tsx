import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PhoneTimezoneField } from "@/components/students/phone-timezone-field";
import { Button } from "@/components/ui/button";
import type { Student } from "@/lib/types/database";

export function StudentForm({
  student,
  action,
  children,
}: {
  student?: Student;
  action: (formData: FormData) => void;
  children?: React.ReactNode;
}) {
  return (
    <form action={action} className="max-w-xl space-y-4">
      <div>
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" required defaultValue={student?.full_name} />
      </div>

      <fieldset className="rounded-lg border border-primary-100 p-4">
        <legend className="px-1 text-sm font-medium text-primary-800">Guardian / contact</legend>
        <div className="space-y-4">
          <PhoneTimezoneField
            defaultPhone={student?.guardian_phone ?? ""}
            defaultTimezone={student?.timezone}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="guardian_name">Guardian name</Label>
              <Input id="guardian_name" name="guardian_name" defaultValue={student?.guardian_name ?? ""} />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" defaultValue={student?.country ?? ""} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="guardian_email">Guardian email</Label>
              <Input
                id="guardian_email"
                name="guardian_email"
                type="email"
                defaultValue={student?.guardian_email ?? ""}
              />
            </div>
          </div>
        </div>
      </fieldset>

      <div>
        <Label htmlFor="enrollment_status">Enrollment status</Label>
        <Select id="enrollment_status" name="enrollment_status" defaultValue={student?.enrollment_status ?? "trial"}>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={student?.notes ?? ""} />
      </div>

      {children}

      <Button type="submit">{student ? "Save changes" : "Add student"}</Button>
    </form>
  );
}
