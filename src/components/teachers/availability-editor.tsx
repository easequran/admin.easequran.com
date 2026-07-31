import { Input, Label } from "@/components/ui/input";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const groups = DAY_NAMES.map((name, dayOfWeek) => ({
    dayOfWeek,
    name,
    windows: availability.filter((a) => a.day_of_week === dayOfWeek),
  })).filter((g) => g.windows.length > 0);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {groups.length === 0 && <p className="text-sm text-slate-500">No availability set yet.</p>}
        {groups.map((g) => (
          <div
            key={g.dayOfWeek}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-primary-100 bg-primary-50/50 px-3 py-2"
          >
            <Badge tone="accent" className="shrink-0">
              {g.name}
            </Badge>
            <div className="flex flex-1 flex-wrap gap-2">
              {g.windows.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-2.5 py-1 text-xs text-primary-800"
                >
                  {a.local_start_time.slice(0, 5)}–{a.local_end_time.slice(0, 5)} ({a.timezone})
                  <form action={onRemove}>
                    <input type="hidden" name="availability_id" value={a.id} />
                    <button
                      type="submit"
                      className="font-semibold text-red-500 hover:text-red-700"
                      aria-label={`Remove ${g.name} ${a.local_start_time.slice(0, 5)}–${a.local_end_time.slice(0, 5)}`}
                    >
                      ×
                    </button>
                  </form>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <form action={onAdd} className="space-y-3 rounded-lg border border-primary-100 p-4">
        <div>
          <Label>Days</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <label
                key={d.value}
                className="relative cursor-pointer rounded-full border border-primary-200 px-3 py-1.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50 has-[:checked]:border-accent-500 has-[:checked]:bg-accent-500 has-[:checked]:text-primary-900"
              >
                <input type="checkbox" name="day_of_week" value={d.value} className="sr-only" />
                {d.label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Select every day this time range applies to — add them all in one go.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
