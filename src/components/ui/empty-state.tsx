import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** Tighter padding + smaller icon, for use inside an existing card/section. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-12",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-slate-100",
          compact ? "h-9 w-9" : "h-11 w-11",
        )}
      >
        <Icon className={cn("text-slate-500", compact ? "h-4 w-4" : "h-5 w-5")} />
      </div>
      <div>
        <p className={cn("font-medium text-primary-900", compact && "text-sm")}>{title}</p>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
