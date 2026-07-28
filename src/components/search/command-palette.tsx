"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { globalSearch, type SearchResultGroup } from "@/lib/actions/global-search";
import type { UserRole } from "@/lib/types/database";

export function CommandPalette({
  open,
  onClose,
  role,
}: {
  open: boolean;
  onClose: () => void;
  role: UserRole;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchResultGroup[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flatItems = groups.flatMap((g) => g.items);

  useEffect(() => {
    if (open) {
      // Reset transient state each time the palette re-opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setGroups([]);
      setActiveIndex(0);
      // Focus after the element mounts.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGroups([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const results = await globalSearch(query);
        setGroups(results);
        setActiveIndex(0);
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function go(href: string) {
    onClose();
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[activeIndex];
      if (item) go(item.href);
    }
  }

  if (!open) return null;

  let runningIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[10vh]" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-primary-100 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-primary-100 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={role === "admin" ? "Search leads, students, teachers, trials, invoices…" : "Search…"}
            className="min-w-0 flex-1 border-none bg-transparent text-sm text-primary-900 outline-none placeholder:text-slate-400"
          />
          <button type="button" onClick={onClose} className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Close search">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {isPending && <p className="px-3 py-4 text-sm text-slate-400">Searching…</p>}

          {!isPending && query.trim().length >= 2 && groups.length === 0 && (
            <p className="px-3 py-4 text-sm text-slate-400">No results for &quot;{query}&quot;.</p>
          )}

          {!isPending && query.trim().length < 2 && (
            <p className="px-3 py-4 text-sm text-slate-400">Type at least 2 characters to search the whole portal.</p>
          )}

          {!isPending &&
            groups.map((group) => (
              <div key={group.group} className="mb-2">
                <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {group.group} ({group.items.length})
                </p>
                <ul>
                  {group.items.map((item) => {
                    runningIndex += 1;
                    const isActive = runningIndex === activeIndex;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => go(item.href)}
                          onMouseEnter={() => setActiveIndex(runningIndex)}
                          className={`flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm ${
                            isActive ? "bg-accent-100 text-primary-900" : "text-primary-800 hover:bg-primary-50"
                          }`}
                        >
                          <span className="font-medium">{item.label}</span>
                          {item.sublabel && <span className="text-xs text-slate-500">{item.sublabel}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
