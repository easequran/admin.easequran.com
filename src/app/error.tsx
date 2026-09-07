"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the real error visible for debugging / monitoring.
    console.error("Unhandled app error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-primary-100 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">Something went wrong</p>
        <h1 className="mt-1 text-xl font-semibold text-primary-900">We hit an unexpected error</h1>
        <p className="mt-2 text-sm text-slate-500">
          You can try again, or head back to the dashboard. Nothing you&apos;ve saved is affected.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-slate-400">Reference: {error.digest}</p>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <LinkButton href="/dashboard" variant="outline">
            Dashboard
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
