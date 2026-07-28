import { requireAdmin } from "@/lib/data/profile";
import { getAuditLog } from "@/lib/actions/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { DateTime } from "luxon";

const ACTION_LABELS: Record<string, string> = {
  "lead.deleted": "Deleted lead",
  "lead.status_changed": "Changed lead status",
  "lead.bulk_status_changed": "Bulk-changed lead status",
  "lead.bulk_assigned": "Bulk-assigned leads",
  "student.deleted": "Deleted student",
  "student.status_changed": "Changed student status",
  "student.bulk_status_changed": "Bulk-changed student status",
  "teacher.deleted": "Deleted teacher",
};

const ACTION_TONE: Record<string, "danger" | "warning" | "info"> = {
  "lead.deleted": "danger",
  "student.deleted": "danger",
  "teacher.deleted": "danger",
};

export default async function AuditLogPage() {
  const profile = await requireAdmin();
  const entries = await getAuditLog(200);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Who changed what, and when — deletions, status changes, and bulk actions across the portal."
      />

      <Card>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No audit entries yet.</p>
          ) : (
            <ul className="divide-y divide-primary-50">
              {entries.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-start justify-between gap-2 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={ACTION_TONE[entry.action] ?? "info"}>
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </Badge>
                      {entry.entity_label && <span className="font-medium text-primary-900">{entry.entity_label}</span>}
                    </div>
                    {entry.details && <p className="mt-1 text-slate-600">{entry.details}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      {entry.actor_name ?? "Unknown"} · {DateTime.fromISO(entry.created_at).setZone(profile.timezone).toFormat("MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
