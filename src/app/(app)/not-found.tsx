import { LinkButton } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50">
        <FileQuestion className="h-7 w-7 text-primary-400" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-primary-900">We couldn&apos;t find that</h1>
        <p className="mt-1 text-sm text-slate-500">
          This record may have been deleted, or the link is out of date.
        </p>
      </div>
      <LinkButton href="/dashboard">Back to dashboard</LinkButton>
    </div>
  );
}
