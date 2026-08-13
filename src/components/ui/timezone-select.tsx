"use client";

import { Select } from "@/components/ui/input";
import { formatTimezoneOption, listAllTimezones } from "@/lib/utils/timezone";

export function TimezoneSelect({
  name,
  defaultValue,
  value,
  onChange,
  required,
}: {
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
}) {
  const zones = listAllTimezones();
  const controlledProps =
    value !== undefined
      ? { value, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange?.(e.target.value) }
      : { defaultValue: defaultValue ?? "UTC" };
  return (
    <Select name={name} required={required} {...controlledProps}>
      {zones.map((z) => (
        <option key={z} value={z}>
          {formatTimezoneOption(z)}
        </option>
      ))}
    </Select>
  );
}
