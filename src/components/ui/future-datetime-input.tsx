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
 *
 * The value typed here is a naive wall-clock time interpreted in `timezone`
 * (e.g. the lead's timezone), not the admin's device timezone -- so `min`
 * must be "now" expressed as wall-clock time in that same zone. Comparing
 * against the device's own local "now" instead was flagging times that were
 * genuinely in the future (in the selected zone) as being in the past,
 * whenever the admin's device zone was ahead of the selected zone.
 */
export function FutureDateTimeInput({
  timezone,
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "min"> & { timezone?: string }) {
  const [min, setMin] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!timezone) {
      setMin(localNow());
      return;
    }
    let cancelled = false;
    import("luxon").then(({ DateTime }) => {
      if (cancelled) return;
      setMin(DateTime.now().setZone(timezone).toFormat("yyyy-LL-dd'T'HH:mm"));
    });
    return () => {
      cancelled = true;
    };
  }, [timezone]);
  return <Input type="datetime-local" min={min} {...props} />;
}
