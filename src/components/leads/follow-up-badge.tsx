import { Badge } from "@/components/ui/badge";
import { DateTime } from "luxon";

export function FollowUpBadge({ nextFollowUpAt }: { nextFollowUpAt: string | null }) {
  if (!nextFollowUpAt) {
    return <Badge tone="neutral">No follow-up scheduled</Badge>;
  }

  const dt = DateTime.fromISO(nextFollowUpAt);
  const now = DateTime.now();

  if (dt < now) {
    return <Badge tone="danger">Overdue · {dt.toRelative()}</Badge>;
  }
  if (dt.hasSame(now, "day")) {
    return <Badge tone="warning">Follow up today · {dt.toFormat("h:mm a")}</Badge>;
  }
  return <Badge tone="info">Follow up {dt.toRelative()}</Badge>;
}
