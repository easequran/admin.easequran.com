import Image from "next/image";
import { signOut } from "@/lib/actions/auth";
import type { Profile } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";
import { LogOut, Menu, Search, Clock } from "lucide-react";

const ROLE_LABEL: Record<Profile["role"], string> = {
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
};

const ROLE_TONE: Record<Profile["role"], "accent" | "success" | "info"> = {
  admin: "accent",
  teacher: "success",
  student: "info",
};

export function Topbar({
  profile,
  onMenuClick,
  onOpenSearch,
}: {
  profile: Profile;
  onMenuClick: () => void;
  onOpenSearch: () => void;
}) {
  return (
    <header className="flex h-16 items-center justify-between gap-2 border-b-2 border-accent-500 bg-white px-3 shadow-sm sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="shrink-0 rounded-md p-2 text-primary-700 hover:bg-primary-50 md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 p-1.5">
          <Image src="/logo.png" alt="Ease Quran" width={24} height={24} unoptimized />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-primary-900">{profile.full_name}</p>
            <Badge tone={ROLE_TONE[profile.role]} className="shrink-0">
              {ROLE_LABEL[profile.role]}
            </Badge>
          </div>
          <p className="hidden text-xs text-slate-500 sm:block">Welcome back</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-4">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2 rounded-lg border border-primary-100 px-3 py-2 text-sm text-slate-500 transition-colors hover:border-accent-300 hover:bg-accent-50 hover:text-primary-700"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Search…</span>
          <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">
            Ctrl K
          </kbd>
        </button>
        <span className="hidden items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 lg:inline-flex">
          <Clock className="h-3 w-3" />
          {profile.timezone}
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 sm:px-3"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
