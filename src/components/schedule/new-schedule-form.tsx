import { Input, Label, Select } from "@/components/ui/input";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { Button } from "@/components/ui/button";
import { createRecurringSchedule } from "@/lib/actions/schedule";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function NewScheduleForm({
  students,
  teachers,
}: {
  students: { id: string; full_name: string; timezone: string }[];
  teachers: { id: string; name: string }[];
}) {
  return (
    <form action={createRecurringSchedule} className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="student_id">Student</Label>
        <Select id="student_id" name="student_id" required>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="teacher_id">Teacher</Label>
        <Select id="teacher_id" name="teacher_id" required>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
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
        <Label htmlFor="timezone">Time is in timezone</Label>
        <TimezoneSelect name="timezone" required />
      </div>
      <div>
        <Label htmlFor="duration_minutes">Duration</Label>
        <Select id="duration_minutes" name="duration_minutes" defaultValue="30" required>
          <option value="30">30 minutes</option>
          <option value="60">60 minutes</option>
        </Select>
      </div>
      <Button type="submit" className="col-span-2">
        Schedule weekly class
      </Button>
    </form>
  );
}
