"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function PasswordField({ glass = false }: { glass?: boolean }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Lock
        className={cn(
          "pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2",
          glass ? "text-white/50" : "text-primary-300",
        )}
      />
      <input
        id="password"
        name="password"
        type={visible ? "text" : "password"}
        required
        placeholder="••••••••"
        autoComplete="current-password"
        className={cn(
          "w-full rounded-lg border py-2.5 pl-8 pr-11 text-sm focus:outline-none focus:ring-2",
          glass
            ? "border-white/25 bg-white/10 text-white placeholder:text-white/40 backdrop-blur-sm focus:border-accent-300 focus:ring-accent-300/30"
            : "border-primary-200 bg-white text-primary-900 placeholder:text-slate-400 focus:border-accent-400 focus:ring-accent-100",
        )}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2",
          glass ? "text-white/50 hover:text-white" : "text-slate-400 hover:text-primary-600",
        )}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
