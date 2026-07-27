import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/** Service-role client — server-only, bypasses RLS. Never import from client components. */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
