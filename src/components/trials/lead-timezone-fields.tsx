"use client";

import { useState } from "react";
import { Label, Select } from "@/components/ui/input";
import { TimezoneSelect } from "@/components/ui/timezone-select";

export function LeadTimezoneFields({
  leads,
  defaultLeadId,
}: {
  leads: { id: string; full_name: string; timezone: string | null }[];
  defaultLeadId?: string;
}) {
  const initialLead = leads.find((l) => l.id === defaultLeadId) ?? leads[0];
  const [timezone, setTimezone] = useState(initialLead?.timezone || "UTC");
  const [manuallyEditedTimezone, setManuallyEditedTimezone] = useState(false);

  function handleLeadChange(leadId: string) {
    if (manuallyEditedTimezone) return;
    const lead = leads.find((l) => l.id === leadId);
    setTimezone(lead?.timezone || "UTC");
  }

  return (
    <>
      <div>
        <Label htmlFor="lead_id">Lead</Label>
        <Select
          id="lead_id"
          name="lead_id"
          defaultValue={defaultLeadId}
          required
          onChange={(e) => handleLeadChange(e.target.value)}
        >
          {leads.map((l) => (
            <option key={l.id} value={l.id}>
              {l.full_name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="timezone">Timezone (for the date &amp; time below)</Label>
        <TimezoneSelect
          name="timezone"
          required
          value={timezone}
          onChange={(tz) => {
            setTimezone(tz);
            setManuallyEditedTimezone(true);
          }}
        />
        <p className="mt-1 text-xs text-slate-500">
          Pre-filled from the lead&apos;s saved timezone — edit if it&apos;s wrong.
        </p>
      </div>
    </>
  );
}
