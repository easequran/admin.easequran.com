import Image from "next/image";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-primary-100 bg-white p-8 text-center shadow-sm">
        <Image src="/logo.png" alt="Ease Quran" width={56} height={56} unoptimized className="mx-auto" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent-600">404</p>
        <h1 className="mt-1 text-xl font-semibold text-primary-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <div className="mt-6">
          <LinkButton href="/dashboard">Back to dashboard</LinkButton>
        </div>
      </div>
    </div>
  );
}
