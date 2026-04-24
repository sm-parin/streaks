"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, ClipboardList, CalendarCheck, Users, Bell } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/streaks", icon: Flame,         label: "Streaks", color: "var(--tab-streaks)" },
  { href: "/records", icon: ClipboardList, label: "Records", color: "var(--tab-records)" },
  { href: "/today",   icon: CalendarCheck, label: "Today",   color: "var(--tab-today)"   },
  { href: "/social",  icon: Users,         label: "Social",  color: "var(--tab-social)"  },
  { href: "/inbox",   icon: Bell,          label: "Inbox",   color: "var(--tab-inbox)"   },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[200]",
        "bg-[var(--color-bg)]/95 backdrop-blur-md",
        "border-t border-[var(--color-border)]",
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <div className="max-w-2xl mx-auto flex items-stretch">
        {NAV_ITEMS.map(({ href, icon: Icon, label, color }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3",
                "text-xs font-medium transition-colors duration-[var(--transition-fast)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-inset",
                isActive
                  ? "text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-transform duration-[var(--transition-fast)]",
                  isActive && "scale-110"
                )}
                style={isActive ? { color } : undefined}
                aria-hidden="true"
              />
              <span style={isActive ? { color } : undefined}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
