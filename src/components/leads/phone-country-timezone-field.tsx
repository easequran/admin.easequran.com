"use client";

import { useState } from "react";
import { Input, Label, Select } from "@/components/ui/input";
import { listAllTimezones } from "@/lib/utils/timezone";
import { guessTimezoneFromPhone, type PhoneTimezoneGuess } from "@/lib/utils/phone-timezone";

export function PhoneCountryTimezoneField({
  defaultPhone,
  defaultCountry,
  defaultTimezone,
}: {
  defaultPhone?: string;
  defaultCountry?: string;
  defaultTimezone?: string;
}) {
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [country, setCountry] = useState(defaultCountry ?? "");
  const [timezone, setTimezone] = useState(defaultTimezone ?? "UTC");
  const [manuallyEditedCountry, setManuallyEditedCountry] = useState(Boolean(defaultCountry));
  const [manuallyEditedTimezone, setManuallyEditedTimezone] = useState(Boolean(defaultTimezone));
  const [guess, setGuess] = useState<PhoneTimezoneGuess | null>(null);

  const zones = listAllTimezones();

  function handlePhoneChange(value: string) {
    setPhone(value);
    const detected = guessTimezoneFromPhone(value);
    setGuess(detected);
    if (detected) {
      if (!manuallyEditedTimezone) setTimezone(detected.timezone);
      if (!manuallyEditedCountry) setCountry(detected.countryName);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="phone">Phone (with country code)</Label>
        <Input
          id="phone"
          name="phone"
          placeholder="e.g. +923001234567"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
        />
        {guess && (
          <p className="mt-1 text-xs text-accent-700">
            Detected: <span className="font-medium">{guess.label}</span>
          </p>
        )}
        {!guess && phone.length > 3 && (
          <p className="mt-1 text-xs text-slate-400">Couldn&apos;t detect a country from this number.</p>
        )}
      </div>

      <div>
        <Label htmlFor="country">Country</Label>
        <Input
          id="country"
          name="country"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setManuallyEditedCountry(true);
          }}
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Select
          id="timezone"
          name="timezone"
          value={timezone}
          onChange={(e) => {
            setTimezone(e.target.value);
            setManuallyEditedTimezone(true);
          }}
        >
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-slate-400">
          Country and timezone are pre-filled from the phone number — edit either if the guess is wrong.
        </p>
      </div>
    </div>
  );
}
