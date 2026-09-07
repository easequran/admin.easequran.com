import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { StatTone } from "@/components/ui/stat-card";

/**
 * A plain icon + title/description row for sections whose content already
 * owns its own Card (e.g. a client table component). Neutral gray, not
 * color-per-section -- matches SectionCard.
 */
export function SectionHeading({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  /** @deprecated Ignored -- sections render neutral gray by design. */
  tone?: StatTone;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <Icon className="h-5 w-5 text-slate-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-primary-900">{title}</h2>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}
