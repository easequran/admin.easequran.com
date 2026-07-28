import { signOut } from "@/lib/actions/auth";
import type { Profile } from "@/lib/types/database";
import { LogOut, Menu, Search } from "lucide-react";

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
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-4">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2 rounded-lg border border-primary-100 px-3 py-2 text-sm text-slate-500 hover:bg-primary-50 hover:text-primary-700"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Search…</span>
          <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">
            Ctrl K
          </kbd>
        </button>
        <span className="hidden rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 lg:inline-block">
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
