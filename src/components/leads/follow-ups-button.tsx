import Link from "next/link";
import { Bell } from "lucide-react";

export function FollowUpsButton({ overdueCount }: { overdueCount: number }) {
  const hasOverdue = overdueCount > 0;

  return (
    <Link
      href="/leads/follow-ups"
      prefetch={false}
      className={`relative inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
        hasOverdue
          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
          : "border-primary-200 text-primary-700 hover:bg-primary-50"
      }`}
    >
      <Bell className="h-4 w-4" />
      Follow-ups
      {hasOverdue && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
          {overdueCount}
        </span>
      )}
    </Link>
  );
}
