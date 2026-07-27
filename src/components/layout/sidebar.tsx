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
} from "lucide-react";

const NAV: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; roles: UserRole[] }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "teacher", "student"] },
  { href: "/schedule", label: "Schedule", icon: CalendarClock, roles: ["admin", "teacher", "student"] },
  { href: "/students", label: "Students", icon: Users, roles: ["admin", "teacher"] },
  { href: "/teachers", label: "Teachers", icon: GraduationCap, roles: ["admin"] },
  { href: "/leads", label: "Leads (CRM)", icon: UserPlus, roles: ["admin", "teacher"] },
  { href: "/trials", label: "Trial Classes", icon: Sparkles, roles: ["admin", "teacher"] },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck, roles: ["admin", "teacher"] },
  { href: "/invoices", label: "Invoices & Fees", icon: Receipt, roles: ["admin", "student"] },
];

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = NAV.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-primary-100 bg-primary-600 text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <Image src="/logo.png" alt="Ease Quran" width={36} height={36} className="rounded-md" />
        <span className="text-lg font-semibold">Ease Quran</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary-100 transition-colors hover:bg-primary-500/40 hover:text-white",
                active && "bg-accent-500 text-primary-900 hover:bg-accent-500 hover:text-primary-900",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
