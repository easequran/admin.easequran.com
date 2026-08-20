import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { StatTone } from "@/components/ui/stat-card";
import { SECTION_TONE_CLASSES } from "@/components/ui/section-card";

/**
 * A colored icon + title/description row for sections whose content
 * already owns its own Card (e.g. a client table component) -- gives the
 * same visual identity as SectionCard without double-wrapping in a card.
 */
export function SectionHeading({
  icon: Icon,
  tone = "info",
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  tone?: StatTone;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  const classes = SECTION_TONE_CLASSES[tone];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", classes.iconBg)}>
          <Icon className={cn("h-5 w-5", classes.iconColor)} />
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
