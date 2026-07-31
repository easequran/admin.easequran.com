"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

/** A submit button that shows a spinner and disables itself while its form's server action is in flight. */
export function SubmitButton({
  children,
  pendingText,
  ...props
}: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? (pendingText ?? children) : children}
    </Button>
  );
}
