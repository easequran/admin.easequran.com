"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-primary-100 !bg-white !shadow-lg !shadow-primary-900/5 !font-sans",
          title: "!text-primary-900 !font-semibold",
          description: "!text-primary-700",
          success: "!border-accent-300 [&_[data-icon]]:!text-accent-500",
          error: "!border-red-200 [&_[data-icon]]:!text-red-600",
          actionButton: "!bg-primary-600 !text-white",
          cancelButton: "!bg-primary-50 !text-primary-700",
        },
      }}
    />
  );
}
