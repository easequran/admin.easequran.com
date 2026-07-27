import Image from "next/image";
import { requestPasswordReset } from "@/lib/actions/auth";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-primary-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="Ease Quran" width={64} height={64} unoptimized />
          <h1 className="text-xl font-semibold text-primary-900">Reset your password</h1>
          <p className="text-center text-sm text-slate-500">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {params.sent ? (
          <>
            <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              If an account exists for that email, a reset link is on its way.
            </p>
            <a href="/login" className="text-sm font-medium text-primary-700 hover:underline">
              Back to sign in
            </a>
          </>
        ) : (
          <form action={requestPasswordReset} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" />
            </div>
            <Button type="submit" className="w-full">
              Send reset link
            </Button>
            <a href="/login" className="block text-center text-sm font-medium text-primary-700 hover:underline">
              Back to sign in
            </a>
          </form>
        )}
      </div>
    </div>
  );
}
