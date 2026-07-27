import { signOut } from "@/lib/actions/auth";
import type { Profile } from "@/lib/types/database";
import { LogOut } from "lucide-react";

export function Topbar({ profile }: { profile: Profile }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-primary-100 bg-white px-6">
      <div>
        <p className="text-sm text-slate-500">Welcome back,</p>
        <p className="font-semibold text-primary-900">{profile.full_name}</p>
      </div>
      <div className="flex items-center gap-4">
        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
          {profile.timezone}
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-primary-700"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
