"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AppSectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-primary-900">This page ran into a problem</h1>
        <p className="mt-1 text-sm text-slate-500">
          Something failed while loading this screen. Your data is safe — try again.
        </p>
        {error.digest && <p className="mt-1 text-xs text-slate-500">Reference: {error.digest}</p>}
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <LinkButton href="/dashboard" variant="outline">
          Dashboard
        </LinkButton>
      </div>
    </div>
  );
}
