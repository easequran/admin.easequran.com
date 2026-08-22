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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-primary-900 px-4 py-12">
      {/* Subtle geometric-star texture, on-brand for an Islamic studies academy without being literal or busy. */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.05]" aria-hidden="true">
        <defs>
          <pattern id="star-grid" width="72" height="72" patternUnits="userSpaceOnUse">
            <path
              d="M36 4 L44 28 L68 28 L48 42 L56 66 L36 52 L16 66 L24 42 L4 28 L28 28 Z"
              fill="none"
              stroke="#fdac32"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#star-grid)" />
      </svg>

      <div className="pointer-events-none absolute -left-40 top-1/2 h-[560px] w-[560px] -translate-y-1/2 rounded-full bg-primary-600/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-accent-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-[420px] w-[420px] rounded-full bg-primary-500/30 blur-3xl" />

      <div className="relative w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2.5 shadow-lg shadow-black/20">
            <Image src="/logo.png" alt="Ease Quran" width={44} height={44} unoptimized />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Ease Quran</h1>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-accent-300">
              Academy Management Portal
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/30">
          <div className="h-[3px] w-full bg-gradient-to-r from-accent-400 via-accent-500 to-accent-600" />

          <div className="p-8">
            <h2 className="text-lg font-semibold text-primary-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Enter your credentials to access your dashboard.</p>

            {params.error && (
              <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {params.error}
              </p>
            )}

            <form action={signIn} className="mt-6 space-y-4">
              <input type="hidden" name="redirect" value={params.redirect ?? "/dashboard"} />
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-primary-200 bg-white py-2.5 pl-10 pr-3 text-sm text-primary-900 placeholder:text-slate-400 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-100"
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
              <SubmitButton
                className="w-full justify-center bg-primary-700 py-2.5 hover:bg-primary-800"
                pendingText="Signing in..."
              >
                Sign in
              </SubmitButton>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-primary-200/70">
          &copy; {new Date().getFullYear()} Ease Quran Online Academy. All rights reserved.
        </p>
      </div>
    </div>
  );
}
