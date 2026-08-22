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
  Wallet,
  Sparkles,
  Settings,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  History,
  Landmark,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; roles: UserRole[] };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "teacher", "student"] },
      { href: "/schedule", label: "Schedule", icon: CalendarClock, roles: ["admin", "teacher", "student"] },
      { href: "/timetable", label: "Timetable", icon: CalendarClock, roles: ["teacher"] },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/students", label: "Students", icon: Users, roles: ["admin"] },
      { href: "/teachers", label: "Teachers", icon: GraduationCap, roles: ["admin"] },
      { href: "/leads", label: "Leads (CRM)", icon: UserPlus, roles: ["admin"] },
      { href: "/trials", label: "Trial Classes", icon: Sparkles, roles: ["admin"] },
    ],
  },
  {
    label: "Operations",
    items: [{ href: "/attendance", label: "Attendance", icon: ClipboardCheck, roles: ["admin", "teacher"] }],
  },
  {
    label: "Billing",
    items: [
      { href: "/fees", label: "Fees", icon: Wallet, roles: ["admin"] },
      { href: "/invoices", label: "Invoices & Fees", icon: Receipt, roles: ["admin", "student"] },
    ],
  },
  {
    label: "Finance",
    items: [{ href: "/finance", label: "Finance", icon: Landmark, roles: ["admin"] }],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings/integrations", label: "Integrations", icon: Settings, roles: ["admin"] },
      { href: "/settings/audit-log", label: "Audit Log", icon: History, roles: ["admin"] },
    ],
  },
];

export function Sidebar({
  role,
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  role: UserRole;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((item) => item.roles.includes(role)) })).filter(
    (g) => g.items.length > 0,
  );

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
          "fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col border-r border-primary-100 bg-primary-600 text-white transition-transform duration-200 ease-in-out md:sticky md:top-0 md:h-screen md:shrink-0 md:translate-x-0 md:transition-[width] md:duration-200",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed ? "md:w-[76px]" : "md:w-64",
        )}
      >
        <div className={cn("flex items-center justify-between gap-3 px-5 py-5", collapsed && "md:justify-center md:px-3")}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm">
              <Image src="/logo.png" alt="Ease Quran" width={32} height={32} unoptimized />
            </div>
            <span className={cn("text-lg font-semibold truncate", collapsed && "md:hidden")}>Ease Quran</span>
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

        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "mx-3 mb-2 hidden items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-primary-100 hover:bg-primary-500/40 hover:text-white md:inline-flex",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4 shrink-0" /> : <PanelLeftClose className="h-4 w-4 shrink-0" />}
          {!collapsed && <span>Collapse</span>}
        </button>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {groups.map((group, groupIndex) => (
            <div key={group.label} className={cn(groupIndex > 0 && "mt-4 border-t border-white/10 pt-4")}>
              <p
                className={cn(
                  "mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-primary-200/70",
                  collapsed && "md:hidden",
                )}
              >
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border-l-[3px] border-transparent py-2 pl-[9px] pr-3 text-sm font-medium text-primary-100 transition-all duration-150 hover:translate-x-0.5 hover:bg-primary-500/40 hover:text-white",
                        active &&
                          "border-accent-300 bg-accent-500 text-primary-900 hover:translate-x-0 hover:bg-accent-500 hover:text-primary-900",
                        collapsed && "md:justify-center md:border-l-0 md:px-0",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className={cn(collapsed && "md:hidden")}>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
