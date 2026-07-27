import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";
import { redirect } from "next/navigation";

/**
 * Request-memoized: the (app) layout and every page under it call this
 * independently, so without caching a single navigation would hit
 * Supabase twice for the same data. `cache()` dedupes those calls within
 * one request-render pass.
 *
 * Uses getSession() (reads the cookie locally) rather than getUser()
 * (which revalidates over the network) because our middleware
 * (src/lib/supabase/middleware.ts) already calls getUser() for every
 * matched request and redirects unauthenticated users before this ever
 * runs — re-validating here would just be a second network round-trip
 * for no additional security.
 */
export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (!profile) redirect("/login");

  return profile as Profile;
});
