"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/lib/toast";
import { isNextControlFlowError } from "@/lib/utils/next-errors";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "accent" | "outline" | "ghost" | "danger";

/**
 * The one confirmation pattern for the app: a trigger button that opens an
 * accessible Modal explaining what is about to happen before the (bound,
 * server-side) `action` runs. The server action is unchanged and still owns
 * the real work, permission checks, audit logging and redirect -- this only
 * gates it behind a deliberate second click.
 *
 * Every destructive action in the app currently `redirect()`s on success, so
 * the redirect (and its toast) is what the user sees; `successToast` is only
 * for the rare action that just revalidates in place. Next's redirect /
 * notFound control-flow errors are re-thrown so navigation still happens.
 */
export function ConfirmButton({
  action,
  children,
  title,
  body,
  confirmText = "Delete",
  confirmingText = "Deleting…",
  variant = "danger",
  size = "sm",
  triggerClassName,
  triggerIcon,
  trigger,
  successToast,
  errorToast = "Something went wrong. Please try again.",
  typeToConfirm,
}: {
  action: () => void | Promise<void>;
  children: React.ReactNode;
  title: string;
  body: React.ReactNode;
  confirmText?: string;
  confirmingText?: string;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  triggerClassName?: string;
  triggerIcon?: React.ReactNode;
  /** Render a custom trigger (e.g. a compact icon button) instead of the default <Button>. */
  trigger?: (open: () => void) => React.ReactNode;
  successToast?: string;
  errorToast?: string;
  /** When set, the user must type this exact string to enable the confirm button. */
  typeToConfirm?: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();

  const ready = !typeToConfirm || typed.trim() === typeToConfirm;

  function close() {
    if (pending) return;
    setOpen(false);
    setTyped("");
  }

  function confirm() {
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        if (isNextControlFlowError(err)) throw err;
        toast.error(err instanceof Error ? err.message : errorToast);
        return;
      }
      if (successToast) toast.success(successToast);
      setOpen(false);
      setTyped("");
    });
  }

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <Button
          type="button"
          variant={variant}
          size={size}
          className={triggerClassName}
          onClick={() => setOpen(true)}
        >
          {triggerIcon}
          {children}
        </Button>
      )}

      <Modal open={open} onClose={close} title={title} busy={pending} size="sm">
        <div className="text-sm text-slate-600">{body}</div>

        {typeToConfirm && (
          <div className="mt-4">
            <label htmlFor="confirm-phrase" className="mb-1 block text-sm font-medium text-primary-800">
              Type <span className="font-semibold text-primary-900">{typeToConfirm}</span> to confirm
            </label>
            <input
              id="confirm-phrase"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="w-full rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={close} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={variant === "outline" || variant === "ghost" ? "primary" : variant}
            size="sm"
            onClick={confirm}
            disabled={pending || !ready}
            className={cn(!ready && "cursor-not-allowed")}
          >
            {pending ? confirmingText : confirmText}
          </Button>
        </div>
      </Modal>
    </>
  );
}
