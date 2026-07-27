import { getCurrentProfile } from "@/lib/data/profile";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role={profile.role} />
      <div className="flex flex-1 flex-col">
        <Topbar profile={profile} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
