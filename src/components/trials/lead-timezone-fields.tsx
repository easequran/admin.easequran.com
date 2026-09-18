"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input, Label, Select } from "@/components/ui/input";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { FutureDateTimeInput } from "@/components/ui/future-datetime-input";
import { Search } from "lucide-react";

type Lead = { id: string; full_name: string; timezone: string | null };

export function LeadTimezoneFields({
  leads,
  defaultLeadId,
}: {
  leads: Lead[];
  defaultLeadId?: string;
}) {
  const initialLead = leads.find((l) => l.id === defaultLeadId) ?? leads[0];
  const [leadId, setLeadId] = useState(initialLead?.id ?? "");
  const [timezone, setTimezone] = useState(initialLead?.timezone || "UTC");
  const [manuallyEditedTimezone, setManuallyEditedTimezone] = useState(false);

  const [query, setQuery] = useState(initialLead?.full_name ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  function selectLead(lead: Lead) {
    setLeadId(lead.id);
    setQuery(lead.full_name);
    setOpen(false);
    if (!manuallyEditedTimezone) setTimezone(lead.timezone || "UTC");
  }

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    // The selected lead's name filters everything else out (it's an exact
    // match on itself), so once a choice is made, opening the list again
    // shows every option rather than just the one already picked.
    if (!q || q === (leads.find((l) => l.id === leadId)?.full_name ?? "").toLowerCase()) return leads;
    return leads.filter((l) => l.full_name.toLowerCase().includes(q));
  }, [leads, query, leadId]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleBlur() {
    // Snap the visible text back to the actual selection so a half-typed
    // search string can't be left showing next to a stale/mismatched value.
    setTimeout(() => {
      const selected = leads.find((l) => l.id === leadId);
      setQuery(selected?.full_name ?? "");
      setOpen(false);
    }, 100);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filteredLeads.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const lead = filteredLeads[activeIndex];
      if (lead) selectLead(lead);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        <Label htmlFor="lead_search">Lead</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="lead_search"
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            autoComplete="off"
            placeholder="Search leads by name…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="pl-9"
          />
        </div>
        {open && (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-primary-100 bg-white py-1 shadow-lg"
          >
            {filteredLeads.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-500">No leads match &quot;{query}&quot;.</li>
            )}
            {filteredLeads.map((l, index) => (
              <li key={l.id} role="option" aria-selected={l.id === leadId}>
                <button
                  type="button"
                  // onMouseDown (not onClick) fires before the input's onBlur, so the
                  // click registers before handleBlur can close the dropdown first.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectLead(l);
                  }}
                  onMouseMove={() => setActiveIndex(index)}
                  className={`block w-full px-3 py-2 text-left text-sm ${
                    index === activeIndex ? "bg-accent-100 text-primary-900" : "text-primary-800 hover:bg-primary-50"
                  }`}
                >
                  {l.full_name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {/* Visually hidden but focusable/validated -- this is the actual form
            field; the input above is just the search UI driving its value. */}
        <Select
          aria-hidden="true"
          tabIndex={-1}
          className="sr-only"
          id="lead_id"
          name="lead_id"
          value={leadId}
          required
          onChange={() => {}}
        >
          <option value="" disabled>
            Select a lead
          </option>
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
      <div>
        <Label htmlFor="start_at_local">Date &amp; time</Label>
        <FutureDateTimeInput id="start_at_local" name="start_at_local" timezone={timezone} required />
      </div>
    </>
  );
}
