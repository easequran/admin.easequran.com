"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SetPasswordPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(Boolean(session));
      setCheckingSession(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-primary-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="Ease Quran" width={64} height={64} unoptimized />
          <h1 className="text-xl font-semibold text-primary-900">Set your password</h1>
          <p className="text-center text-sm text-slate-500">
            Choose a password for your Ease Quran account.
          </p>
        </div>

        {checkingSession ? (
          <p className="text-center text-sm text-slate-500">Loading...</p>
        ) : !hasSession ? (
          <>
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              This link has expired or is invalid. Request a new one from your admin, or use
              &quot;Forgot password&quot; on the sign-in page.
            </p>
            <a href="/login" className="text-sm font-medium text-primary-700 hover:underline">
              Back to sign in
            </a>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <div>
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Saving..." : "Set password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
