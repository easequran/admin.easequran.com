import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const OUTCOMES = [
  { value: "", label: "— No specific outcome —" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not interested" },
  { value: "no_answer", label: "No answer" },
  { value: "voicemail", label: "Left voicemail" },
  { value: "callback_requested", label: "Asked to call back" },
  { value: "converted", label: "Ready to convert" },
  { value: "other", label: "Other" },
];

export function LogContactForm({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="space-y-3 rounded-lg border border-primary-100 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="activity_type">Contact type</Label>
          <Select id="activity_type" name="activity_type" defaultValue="call">
            <option value="call">Call</option>
            <option value="message">Message (WhatsApp/SMS)</option>
            <option value="email">Email</option>
            <option value="note">Note only (no contact made)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="outcome">Outcome</Label>
          <Select id="outcome" name="outcome" defaultValue="">
            {OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="content">What happened?</Label>
        <Textarea name="content" id="content" rows={2} placeholder="Call/message summary..." />
      </div>

      <div>
        <Label htmlFor="next_follow_up_at">Next follow-up (optional)</Label>
        <Input id="next_follow_up_at" name="next_follow_up_at" type="datetime-local" />
        <p className="mt-1 text-xs text-slate-400">
          Leave blank to keep the current follow-up date, or set a new one here.
        </p>
      </div>

      <Button type="submit" size="sm">
        Log contact
      </Button>
    </form>
  );
}
