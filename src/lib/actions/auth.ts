"use server";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/utils/site-url";
import { redirect } from "next/navigation";

/**
 * Only a same-origin relative path is a safe post-login destination -- the
 * `redirect` form field round-trips through a `?redirect=` query string that
 * an attacker can hand-craft (e.g. `/login?redirect=https://evil.example`),
 * which would otherwise bounce a user who just typed real credentials
 * straight off-site. `//host/path` is also rejected since browsers treat a
 * leading `//` as protocol-relative (i.e. off-site too).
 */
function safeRedirectPath(value: string): string {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/dashboard";
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectPath(String(formData.get("redirect") ?? "/dashboard"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(redirectTo);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const supabase = await createClient();

  const siteUrl = await getSiteUrl();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback`,
  });

  // Always show the same confirmation, regardless of whether the email
  // exists — avoids leaking which addresses have accounts.
  redirect("/auth/forgot-password?sent=1");
}
