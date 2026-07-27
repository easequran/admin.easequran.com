"use client";

import { Select } from "@/components/ui/input";
import { listAllTimezones } from "@/lib/utils/timezone";

export function TimezoneSelect({
  name,
  defaultValue,
  required,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const zones = listAllTimezones();
  return (
    <Select name={name} defaultValue={defaultValue ?? "UTC"} required={required}>
      {zones.map((z) => (
        <option key={z} value={z}>
          {z}
        </option>
      ))}
    </Select>
  );
}
