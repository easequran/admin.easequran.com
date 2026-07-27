"use client";

import { useState } from "react";
import { Input, Label, Select } from "@/components/ui/input";
import { listAllTimezones } from "@/lib/utils/timezone";
import { guessTimezoneFromPhone, type PhoneTimezoneGuess } from "@/lib/utils/phone-timezone";

export function PhoneTimezoneField({
  defaultPhone,
  defaultTimezone,
}: {
  defaultPhone?: string;
  defaultTimezone?: string;
}) {
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [timezone, setTimezone] = useState(defaultTimezone ?? "UTC");
  const [manuallyEdited, setManuallyEdited] = useState(Boolean(defaultTimezone));
  const [guess, setGuess] = useState<PhoneTimezoneGuess | null>(null);

  const zones = listAllTimezones();

  function handlePhoneChange(value: string) {
    setPhone(value);
    const detected = guessTimezoneFromPhone(value);
    setGuess(detected);
    if (detected && !manuallyEdited) {
      setTimezone(detected.timezone);
    }
  }

  function handleTimezoneChange(value: string) {
    setTimezone(value);
    setManuallyEdited(true);
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="guardian_phone">Guardian phone (with country code)</Label>
        <Input
          id="guardian_phone"
          name="guardian_phone"
          placeholder="e.g. +923001234567"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
        />
        {guess && (
          <p className="mt-1 text-xs text-accent-700">
            Detected: <span className="font-medium">{guess.label}</span> → {guess.timezone}
          </p>
        )}
        {!guess && phone.length > 3 && (
          <p className="mt-1 text-xs text-slate-400">Couldn&apos;t detect a timezone from this number.</p>
        )}
      </div>

      <div>
        <Label htmlFor="timezone">Student timezone</Label>
        <Select
          id="timezone"
          name="timezone"
          value={timezone}
          onChange={(e) => handleTimezoneChange(e.target.value)}
        >
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-slate-400">
          Pre-filled from phone number — change it if the guess is wrong.
        </p>
      </div>
    </div>
  );
}
