import { getCurrentProfile } from "@/lib/data/profile";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  return <AppShell profile={profile}>{children}</AppShell>;
}
