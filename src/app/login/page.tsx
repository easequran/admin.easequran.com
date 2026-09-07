import Image from "next/image";
import { signIn } from "@/lib/actions/auth";
import { Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { PasswordField } from "@/components/auth/password-field";
import { Mail } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <Image src="/login-bg-ai-2.png" alt="" fill priority unoptimized className="object-cover" />
      <div className="absolute inset-0 bg-primary-900/50" />

      <div className="relative w-full max-w-[380px]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/40">
          <div className="h-[3px] w-full bg-gradient-to-r from-accent-400 via-accent-500 to-accent-600" />

          <div className="p-8">
            <div className="mb-6 flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-white p-2.5 shadow-sm">
                <Image src="/logo.png" alt="Ease Quran" width={44} height={44} unoptimized />
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold tracking-tight text-primary-900">Ease Quran</h1>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-600">
                  Academy Management Portal
                </p>
              </div>
            </div>

            {params.error && (
              <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {params.error}
              </p>
            )}

            <form action={signIn} className="space-y-4">
              <input type="hidden" name="redirect" value={params.redirect ?? "/dashboard"} />
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary-300" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-primary-200 bg-white py-2.5 pl-8 pr-3 text-sm text-primary-900 placeholder:text-slate-400 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-100"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="/auth/forgot-password" className="mb-1 text-xs font-medium text-primary-600 hover:underline">
                    Forgot password?
                  </a>
                </div>
                <PasswordField />
              </div>
              <SubmitButton className="w-full justify-center py-2.5" pendingText="Signing in...">
                Sign in
              </SubmitButton>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/80">
          &copy; {new Date().getFullYear()} Ease Quran Online Academy. All rights reserved.
        </p>
      </div>
    </div>
  );
}
