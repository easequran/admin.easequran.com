"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const SIZE_CLASS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
} as const;

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * The single accessible dialog primitive for the app. Handles Escape,
 * backdrop click (on mousedown, so a text-drag that ends outside doesn't
 * close it), focus-in on open / focus-return on close, a Tab focus trap,
 * body scroll lock, `role="dialog"` + `aria-modal` + `aria-labelledby`,
 * a capped height with an internally scrolling body, and a responsive
 * width. Pass `busy` while an action is in flight to block every close
 * path (Escape, backdrop, the header X).
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "sm",
  busy = false,
  hideCloseButton = false,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: keyof typeof SIZE_CLASS;
  busy?: boolean;
  hideCloseButton?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  const requestClose = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Move focus into the dialog on open; restore it to the trigger on close.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panelRef.current)?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        requestClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, requestClose]);

  if (!open) return null;

  function handleTrap(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!nodes || nodes.length === 0) {
      e.preventDefault();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !panelRef.current?.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="eq-anim-overlay fixed inset-0 z-50 flex items-center justify-center bg-primary-950/40 p-4"
      onMouseDown={requestClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleTrap}
        className={cn(
          "eq-anim-panel flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-xl bg-white shadow-xl outline-none",
          SIZE_CLASS[size],
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-primary-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-primary-900">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>
          {!hideCloseButton && (
            <button
              type="button"
              onClick={requestClose}
              disabled={busy}
              aria-label="Close"
              className="-mr-1 -mt-1 shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
