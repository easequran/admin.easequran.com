"use client";

import { useActionState } from "react";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/types/action-state";
import { cn } from "@/lib/utils/cn";

/**
 * A `<form>` wired through `useActionState`. On a failed submit the server
 * action returns `{ error }` instead of throwing, so the page does not
 * navigate and every uncontrolled field keeps the value the user typed --
 * the error just renders inline above the fields. Success paths in the
 * action still `redirect(...)` as before.
 *
 * Fields go in as `children`; a `<SubmitButton>` inside still gets its
 * pending state from `useFormStatus`.
 */
export function ActionForm({
  action,
  children,
  className,
  errorClassName,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  errorClassName?: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_ACTION_STATE);

  return (
    <form action={formAction} className={className}>
      {state.error && (
        <p
          role="alert"
          className={cn(
            "rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700",
            errorClassName,
          )}
        >
          {state.error}
        </p>
      )}
      {children}
    </form>
  );
}
