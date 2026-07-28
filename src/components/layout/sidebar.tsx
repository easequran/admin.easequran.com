"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import type { UserRole } from "@/lib/types/database";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarClock,
  UserPlus,
  ClipboardCheck,
  Receipt,
  Sparkles,
  Settings,
  X,
} from "lucide-react";

const NAV: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; roles: UserRole[] }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "teacher", "student"] },
  { href: "/schedule", label: "Schedule", icon: CalendarClock, roles: ["admin", "teacher", "student"] },
  { href: "/students", label: "Students", icon: Users, roles: ["admin"] },
  { href: "/teachers", label: "Teachers", icon: GraduationCap, roles: ["admin"] },
  { href: "/leads", label: "Leads (CRM)", icon: UserPlus, roles: ["admin"] },
  { href: "/trials", label: "Trial Classes", icon: Sparkles, roles: ["admin"] },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck, roles: ["admin", "teacher"] },
  { href: "/invoices", label: "Invoices & Fees", icon: Receipt, roles: ["admin", "student"] },
  { href: "/settings/integrations", label: "Integrations", icon: Settings, roles: ["admin"] },
];

export function Sidebar({
  role,
  open,
  onClose,
}: {
  role: UserRole;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const items = NAV.filter((item) => item.roles.includes(role));

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col border-r border-primary-100 bg-primary-600 text-white transition-transform duration-200 ease-in-out md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm">
              <Image src="/logo.png" alt="Ease Quran" width={32} height={32} unoptimized />
            </div>
            <span className="text-lg font-semibold">Ease Quran</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-primary-100 hover:bg-primary-500/40 md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary-100 transition-colors hover:bg-primary-500/40 hover:text-white",
                  active && "bg-accent-500 text-primary-900 hover:bg-accent-500 hover:text-primary-900",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
