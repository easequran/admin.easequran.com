"use client";

import { useState } from "react";
import { Label } from "@/components/ui/input";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { FutureDateTimeInput } from "@/components/ui/future-datetime-input";

/**
 * Pairs a `FutureDateTimeInput` with the `TimezoneSelect` its value is
 * interpreted in, so the "not in the past" check runs against wall-clock
 * "now" in whichever zone is currently selected -- not the admin's device
 * zone. See `FutureDateTimeInput` for why that distinction matters.
 */
export function DateTimeTimezoneFields({
  dateTimeId,
  dateTimeName,
  defaultDateTime,
  dateTimeLabel = "Date & time",
  dateTimeClassName,
  timezoneName,
  defaultTimezone,
  timezoneLabel = "That time is in timezone",
}: {
  dateTimeId: string;
  dateTimeName: string;
  defaultDateTime?: string;
  dateTimeLabel?: string;
  dateTimeClassName?: string;
  timezoneName: string;
  defaultTimezone?: string;
  timezoneLabel?: string;
}) {
  const [timezone, setTimezone] = useState(defaultTimezone || "UTC");
  return (
    <>
      <div>
        <Label htmlFor={dateTimeId}>{dateTimeLabel}</Label>
        <FutureDateTimeInput
          id={dateTimeId}
          name={dateTimeName}
          defaultValue={defaultDateTime}
          timezone={timezone}
          required
          className={dateTimeClassName}
        />
      </div>
      <div>
        <Label htmlFor={timezoneName}>{timezoneLabel}</Label>
        <TimezoneSelect name={timezoneName} value={timezone} onChange={setTimezone} required />
      </div>
    </>
  );
}
