import { Input, Label } from "@/components/ui/input";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { Button } from "@/components/ui/button";
import type { TeacherAvailability } from "@/lib/types/database";

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
  const sorted = [...availability].sort((a, b) => a.day_of_week - b.day_of_week);

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {sorted.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded-lg bg-primary-50 px-3 py-2 text-sm"
          >
            <span>
              <span className="font-medium text-primary-900">{DAY_NAMES[a.day_of_week]}</span>{" "}
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
        {sorted.length === 0 && (
          <p className="text-sm text-slate-500">No availability set yet.</p>
        )}
      </ul>

      <form action={onAdd} className="space-y-3 rounded-lg border border-primary-100 p-4">
        <div>
          <Label>Days</Label>
          <div className="flex flex-wrap gap-3">
            {DAYS.map((d) => (
              <label key={d.value} className="flex items-center gap-1.5 text-sm text-primary-800">
                <input
                  type="checkbox"
                  name="day_of_week"
                  value={d.value}
                  className="h-4 w-4 rounded border-primary-300"
                />
                {d.label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Select every day this time range applies to — add them all in one go.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="local_start_time">Start time</Label>
            <Input id="local_start_time" name="local_start_time" type="time" required />
          </div>
          <div>
            <Label htmlFor="local_end_time">End time</Label>
            <Input id="local_end_time" name="local_end_time" type="time" required />
          </div>
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <TimezoneSelect name="timezone" defaultValue={teacherTimezone} required />
        </div>
        <Button type="submit" size="sm" className="w-full">
          Add availability
        </Button>
      </form>
    </div>
  );
}
