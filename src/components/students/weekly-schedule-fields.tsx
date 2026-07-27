import { Input, Label, Select } from "@/components/ui/input";

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function WeeklyScheduleFields({
  teachers,
}: {
  teachers: { id: string; name: string; hourlyRate: number | null; currency: string }[];
}) {
  return (
    <fieldset className="rounded-lg border border-primary-100 p-4">
      <legend className="px-1 text-sm font-medium text-primary-800">
        Weekly class schedule (optional — can also be set up later)
      </legend>
      <div className="space-y-4">
        <div>
          <Label htmlFor="teacher_id">Assign teacher</Label>
          <Select id="teacher_id" name="teacher_id" defaultValue="">
            <option value="">— No teacher yet —</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.currency} {t.hourlyRate ?? "—"}/hr)
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Class days</Label>
          <div className="flex flex-wrap gap-3">
            {DAYS.map((d) => (
              <label key={d.value} className="flex items-center gap-1.5 text-sm text-primary-800">
                <input type="checkbox" name="class_days" value={d.value} className="h-4 w-4 rounded border-primary-300" />
                {d.label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Pick weekday-only, weekend-only, or any mix — each student can have a different pattern.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="class_time">Class time (student&apos;s local time)</Label>
            <Input id="class_time" name="class_time" type="time" />
          </div>
          <div>
            <Label htmlFor="class_duration">Duration</Label>
            <Select id="class_duration" name="class_duration" defaultValue="30">
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
            </Select>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
