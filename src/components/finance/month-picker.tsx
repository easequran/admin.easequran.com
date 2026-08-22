"use client";

import { useRouter } from "next/navigation";

export function MonthPicker({ month }: { month: string }) {
  const router = useRouter();

  return (
    <input
      type="month"
      value={month}
      onChange={(e) => router.push(`/finance?month=${e.target.value}`)}
      className="rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-100"
    />
  );
}
