import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { StatTone } from "@/components/ui/stat-card";

/**
 * A Card with an icon badge and a title/description header -- gives every
 * major section on a page a clear, consistent identity without needing a
 * full custom header each time. Deliberately neutral gray, not
 * color-per-section -- keeps pages calm instead of busy.
 */
export function SectionCard({
  icon: Icon,
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  id,
}: {
  icon?: LucideIcon;
  /** @deprecated Ignored -- sections render neutral gray by design. Accepted only so existing call sites don't need editing. */
  tone?: StatTone;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
}) {
  return (
    <Card id={id} className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <Icon className="h-5 w-5 text-slate-500" />
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
