"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function run() {
      const code = searchParams.get("code");
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else {
          throw new Error("This link is invalid or has expired.");
        }

        router.replace("/auth/set-password");
      } catch (err) {
        setError(err instanceof Error ? err.message : "This link is invalid or has expired.");
      }
    }

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <>
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        <a href="/login" className="text-sm font-medium text-primary-700 hover:underline">
          Back to sign in
        </a>
      </>
    );
  }

  return <p className="text-sm text-slate-500">Verifying your link...</p>;
}

/**
 * Lands here from invite / password-recovery emails. Supabase can deliver
 * the session either as a `?code=` query param (PKCE, exchanged here) or
 * as `#access_token=...&refresh_token=...` in the URL fragment (implicit
 * flow, never sent to the server) — handled client-side so both work
 * regardless of the project's configured flow type.
 */
export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-primary-100 bg-white p-8 text-center shadow-sm">
        <Suspense fallback={<p className="text-sm text-slate-500">Verifying your link...</p>}>
          <CallbackHandler />
        </Suspense>
      </div>
    </div>
  );
}
