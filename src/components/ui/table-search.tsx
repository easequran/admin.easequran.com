"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchInput } from "@/components/ui/search-input";

/**
 * Search box for a server-paginated table. Debounced changes are written to
 * the URL (`?q=`), which re-renders the server page with a fresh query; any
 * `page` param is dropped so the results always start on page 1.
 */
export function TableSearch({
  placeholder = "Search…",
  paramKey = "q",
  debounceMs = 300,
}: {
  placeholder?: string;
  paramKey?: string;
  debounceMs?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramKey) ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the field in sync if the URL changes from elsewhere (back button).
  useEffect(() => {
    setValue(searchParams.get(paramKey) ?? "");
  }, [searchParams, paramKey]);

  function commit(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = next.trim();
    if (trimmed) params.set(paramKey, trimmed);
    else params.delete(paramKey);
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), debounceMs);
  }

  return <SearchInput value={value} onChange={onChange} placeholder={placeholder} />;
}
