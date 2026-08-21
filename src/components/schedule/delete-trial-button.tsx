"use client";

import { Button } from "@/components/ui/button";
import { deleteTrialClass } from "@/lib/actions/schedule";

export function DeleteTrialButton({ occurrenceId }: { occurrenceId: string }) {
  return (
    <form
      action={deleteTrialClass.bind(null, occurrenceId)}
      onSubmit={(e) => {
        if (!confirm("Permanently delete this trial? This can't be undone.")) e.preventDefault();
      }}
    >
      <Button type="submit" variant="danger" size="sm">
        Delete trial
      </Button>
    </form>
  );
}
