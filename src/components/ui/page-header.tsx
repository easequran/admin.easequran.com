import type { LucideIcon } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import type { StatTone } from "@/components/ui/stat-card";

/** Neutral gray icon badge next to the title -- not color-per-page, which
 * made the app feel busy rather than clearer. */
export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  actions,
  icon: Icon,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
}) {
  return (
    <div className="space-y-3">
      {backHref && <BackLink href={backHref} label={backLabel ?? "Back"} />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <Icon className="h-6 w-6 text-slate-500" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-primary-900">{title}</h1>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
