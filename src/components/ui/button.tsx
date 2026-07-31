import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:shadow-md focus-visible:outline-primary-600",
  accent:
    "bg-accent-500 text-primary-900 shadow-sm hover:bg-accent-600 hover:shadow-md focus-visible:outline-accent-500",
  outline:
    "border border-primary-200 text-primary-700 hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-primary-400",
  ghost: "text-primary-700 hover:bg-primary-50",
  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md focus-visible:outline-red-600",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.97] active:shadow-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.97] active:shadow-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}
