import Image from "next/image";
import { signIn } from "@/lib/actions/auth";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-primary-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="Ease Quran" width={64} height={64} unoptimized />
          <h1 className="text-xl font-semibold text-primary-900">Ease Quran</h1>
          <p className="text-sm text-slate-500">Sign in to your academy account</p>
        </div>

        {params.error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </p>
        )}

        <form action={signIn} className="space-y-4">
          <input type="hidden" name="redirect" value={params.redirect ?? "/dashboard"} />
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
