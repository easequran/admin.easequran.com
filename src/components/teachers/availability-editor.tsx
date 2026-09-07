"use client";

import { X } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { toast } from "@/lib/toast";
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
  onRemove: (availabilityId: string) => void | Promise<void>;
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
              {g.windows.map((a) => {
                const range = `${a.local_start_time.slice(0, 5)}–${a.local_end_time.slice(0, 5)}`;
                return (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-2.5 py-1 text-xs text-primary-800"
                  >
                    {range} ({a.timezone})
                    <ConfirmButton
                      action={() => onRemove(a.id)}
                      title="Remove this availability window?"
                      confirmText="Remove"
                      confirmingText="Removing…"
                      errorToast="Failed to remove availability"
                      body={
                        <>
                          Removes <strong className="font-semibold text-primary-900">{g.name} {range}</strong> (
                          {a.timezone}). Classes already booked in this window are not affected.
                        </>
                      }
                      trigger={(open) => (
                        <button
                          type="button"
                          onClick={open}
                          aria-label={`Remove ${g.name} ${range}`}
                          className="-mr-1 flex h-6 w-6 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-400"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    >
                      Remove
                    </ConfirmButton>
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <form
        action={(formData) => {
          const start = String(formData.get("local_start_time") || "");
          const end = String(formData.get("local_end_time") || "");
          // An inverted range (end <= start) isn't rejected server-side --
          // it just silently matches nothing in isWithinAvailability, so a
          // teacher's slot fails every check with no clue why. Catch it here.
          if (start && end && end <= start) {
            toast.error("End time must be after start time.");
            return;
          }
          onAdd(formData);
        }}
        className="space-y-3 rounded-lg border border-primary-100 p-4"
      >
        <div>
          <Label>Days</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <label
                key={d.value}
                className="relative cursor-pointer rounded-full border border-primary-200 px-3 py-1.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50 has-[:checked]:border-accent-500 has-[:checked]:bg-accent-500 has-[:checked]:text-primary-900 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary-400"
              >
                <input type="checkbox" name="day_of_week" value={d.value} className="sr-only" />
                {d.label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">
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
