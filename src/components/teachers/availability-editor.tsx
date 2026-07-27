import { Input, Label, Select } from "@/components/ui/input";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { Button } from "@/components/ui/button";
import type { TeacherAvailability } from "@/lib/types/database";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function AvailabilityEditor({
  teacherTimezone,
  availability,
  onAdd,
  onRemove,
}: {
  teacherTimezone: string;
  availability: TeacherAvailability[];
  onAdd: (formData: FormData) => void;
  onRemove: (formData: FormData) => void;
}) {
  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {availability.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded-lg bg-primary-50 px-3 py-2 text-sm"
          >
            <span>
              <span className="font-medium text-primary-900">{DAYS[a.day_of_week]}</span>{" "}
              {a.local_start_time.slice(0, 5)}–{a.local_end_time.slice(0, 5)} ({a.timezone})
            </span>
            <form action={onRemove}>
              <input type="hidden" name="availability_id" value={a.id} />
              <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                Remove
              </button>
            </form>
          </li>
        ))}
        {availability.length === 0 && (
          <p className="text-sm text-slate-500">No availability set yet.</p>
        )}
      </ul>

      <form action={onAdd} className="grid grid-cols-2 gap-3 rounded-lg border border-primary-100 p-4">
        <div className="col-span-2">
          <Label htmlFor="day_of_week">Day</Label>
          <Select id="day_of_week" name="day_of_week" defaultValue="1" required>
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="local_start_time">Start time</Label>
          <Input id="local_start_time" name="local_start_time" type="time" required />
        </div>
        <div>
          <Label htmlFor="local_end_time">End time</Label>
          <Input id="local_end_time" name="local_end_time" type="time" required />
        </div>
        <div className="col-span-2">
          <Label htmlFor="timezone">Timezone</Label>
          <TimezoneSelect name="timezone" defaultValue={teacherTimezone} required />
        </div>
        <Button type="submit" size="sm" className="col-span-2">
          Add slot
        </Button>
      </form>
    </div>
  );
}
