"use client";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { deleteTrialClass } from "@/lib/actions/schedule";

export function DeleteTrialButton({ occurrenceId }: { occurrenceId: string }) {
  return (
    <ConfirmButton
      action={deleteTrialClass.bind(null, occurrenceId)}
      title="Delete this trial permanently?"
      confirmText="Delete trial"
      errorToast="Failed to delete trial"
      body="This removes the trial booking from the list entirely, along with its calendar invite. This can't be undone."
    >
      Delete trial
    </ConfirmButton>
  );
}
