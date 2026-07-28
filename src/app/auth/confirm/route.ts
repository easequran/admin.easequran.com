import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifies invite/recovery links via token_hash + verifyOtp instead of the
 * PKCE code-exchange flow used by /auth/callback. PKCE requires the code
 * verifier to still be present in whichever browser generated the original
 * request -- for admin-triggered invite/reset emails that's essentially
 * never true, since the recipient almost always opens the link in a
 * different browser or app (Gmail app vs. desktop Chrome, another device,
 * etc.), which is exactly what produced the "PKCE code verifier not found
 * in storage" error. verifyOtp has no such requirement, so it works
 * regardless of where the link is opened.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent("This link is invalid or has expired.")}`, request.url),
  );
}
