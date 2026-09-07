import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export type StatTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const STAT_TONE_CLASSES: Record<StatTone, { bg: string; icon: string; value: string }> = {
  neutral: { bg: "bg-slate-100", icon: "text-slate-600", value: "text-primary-900" },
  success: { bg: "bg-emerald-100", icon: "text-emerald-700", value: "text-primary-900" },
  warning: { bg: "bg-amber-100", icon: "text-amber-700", value: "text-primary-900" },
  danger: { bg: "bg-red-100", icon: "text-red-600", value: "text-red-600" },
  info: { bg: "bg-blue-100", icon: "text-blue-700", value: "text-primary-900" },
  accent: { bg: "bg-accent-100", icon: "text-accent-700", value: "text-primary-900" },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: StatTone;
  /** When set, the card becomes a link and gets a hover/focus affordance. Static otherwise. */
  href?: string;
}) {
  const classes = STAT_TONE_CLASSES[tone];

  const card = (
    <Card
      className={cn(
        "h-full",
        href && "transition-shadow hover:border-primary-200 hover:shadow-md",
      )}
    >
      <CardContent className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", classes.bg)}>
          <Icon className={cn("h-5 w-5", classes.icon)} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{label}</p>
          <p className={cn("text-2xl font-semibold", classes.value)}>{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link
      href={href}
      className="block rounded-xl outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
    >
      {card}
    </Link>
  );
}
