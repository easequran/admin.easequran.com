import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { StatTone } from "@/components/ui/stat-card";

export const SECTION_TONE_CLASSES: Record<StatTone, { border: string; iconBg: string; iconColor: string }> = {
  neutral: { border: "border-l-slate-400", iconBg: "bg-slate-100", iconColor: "text-slate-600" },
  success: { border: "border-l-emerald-500", iconBg: "bg-emerald-100", iconColor: "text-emerald-700" },
  warning: { border: "border-l-amber-500", iconBg: "bg-amber-100", iconColor: "text-amber-700" },
  danger: { border: "border-l-red-500", iconBg: "bg-red-100", iconColor: "text-red-600" },
  info: { border: "border-l-blue-500", iconBg: "bg-blue-100", iconColor: "text-blue-700" },
  accent: { border: "border-l-accent-500", iconBg: "bg-accent-100", iconColor: "text-accent-700" },
};

/** Tinted `<thead>` background + text per tone, so a table's column header
 * row matches the color of the section/page it lives in instead of always
 * being the same neutral navy-tinted strip. */
export const TABLE_HEAD_TONE_CLASSES: Record<StatTone, string> = {
  neutral: "bg-slate-50 text-slate-500",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
  accent: "bg-accent-50 text-accent-700",
};

/**
 * A Card with a colored left accent, an icon badge, and a title/description
 * header -- gives every major section on a page a clear, consistent visual
 * identity instead of a plain bordered box, without needing a full custom
 * header each time.
 */
export function SectionCard({
  icon: Icon,
  tone = "info",
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  id,
}: {
  icon?: LucideIcon;
  tone?: StatTone;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
}) {
  const classes = SECTION_TONE_CLASSES[tone];
  return (
    <Card id={id} className={cn("overflow-hidden border-l-4", classes.border, className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", classes.iconBg)}>
              <Icon className={cn("h-5 w-5", classes.iconColor)} />
            </div>
          )}
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        {actions}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
