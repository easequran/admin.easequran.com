"use client";

import { useMemo, useState } from "react";
import { Input, Label, Select } from "@/components/ui/input";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { FutureDateTimeInput } from "@/components/ui/future-datetime-input";
import { Search } from "lucide-react";

export function LeadTimezoneFields({
  leads,
  defaultLeadId,
}: {
  leads: { id: string; full_name: string; timezone: string | null }[];
  defaultLeadId?: string;
}) {
  const initialLead = leads.find((l) => l.id === defaultLeadId) ?? leads[0];
  const [leadId, setLeadId] = useState(initialLead?.id ?? "");
  const [timezone, setTimezone] = useState(initialLead?.timezone || "UTC");
  const [manuallyEditedTimezone, setManuallyEditedTimezone] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");

  function handleLeadChange(newLeadId: string) {
    setLeadId(newLeadId);
    if (manuallyEditedTimezone) return;
    const lead = leads.find((l) => l.id === newLeadId);
    setTimezone(lead?.timezone || "UTC");
  }

  const filteredLeads = useMemo(() => {
    const query = leadSearch.trim().toLowerCase();
    if (!query) return leads;
    const matches = leads.filter((l) => l.full_name.toLowerCase().includes(query));
    // Keep the currently selected lead selectable even if it no longer
    // matches the search, so filtering can't silently change the selection.
    if (leadId && !matches.some((l) => l.id === leadId)) {
      const selected = leads.find((l) => l.id === leadId);
      if (selected) return [selected, ...matches];
    }
    return matches;
  }, [leads, leadSearch, leadId]);

  return (
    <>
      <div>
        <Label htmlFor="lead_search">Lead</Label>
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="lead_search"
            type="text"
            placeholder="Search leads by name…"
            value={leadSearch}
            onChange={(e) => setLeadSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          id="lead_id"
          name="lead_id"
          value={leadId}
          required
          onChange={(e) => handleLeadChange(e.target.value)}
        >
          {filteredLeads.length === 0 && <option value="">No leads match &quot;{leadSearch}&quot;</option>}
          {filteredLeads.map((l) => (
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
      <div>
        <Label htmlFor="start_at_local">Date &amp; time</Label>
        <FutureDateTimeInput id="start_at_local" name="start_at_local" timezone={timezone} required />
      </div>
    </>
  );
}
