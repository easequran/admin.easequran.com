import { signOut } from "@/lib/actions/auth";
import type { Profile } from "@/lib/types/database";
import { LogOut, Menu } from "lucide-react";

export function Topbar({ profile, onMenuClick }: { profile: Profile; onMenuClick: () => void }) {
  return (
    <header className="flex h-16 items-center justify-between gap-2 border-b border-primary-100 bg-white px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="shrink-0 rounded-md p-2 text-primary-700 hover:bg-primary-50 md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="hidden text-sm text-slate-500 sm:block">Welcome back,</p>
          <p className="truncate font-semibold text-primary-900">{profile.full_name}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <span className="hidden rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 sm:inline-block">
          {profile.timezone}
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-primary-700 sm:px-3"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
