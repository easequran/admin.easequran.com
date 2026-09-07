"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";

function localNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * A `datetime-local` input that won't accept a past time. `min` is applied
 * after mount (client clock, correct timezone) so it never causes an
 * SSR/hydration mismatch. A soft guard -- server actions still validate.
 */
export function FutureDateTimeInput(props: Omit<ComponentProps<typeof Input>, "type" | "min">) {
  const [min, setMin] = useState<string | undefined>(undefined);
  useEffect(() => {
    setMin(localNow());
  }, []);
  return <Input type="datetime-local" min={min} {...props} />;
}
