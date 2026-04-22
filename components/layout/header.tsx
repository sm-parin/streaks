"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { useUser } from "@/lib/hooks/use-user";
import { getDisplayName, getInitials } from "@/lib/utils/display-name";

export function Header() {
  const { user } = useUser();

  const displayName = user ? getDisplayName(user) : "…";
  const initials = getInitials(displayName);

  return (
    <header className="sticky top-0 z-[200] w-full bg-[var(--color-bg)]/90 backdrop-blur-md border-b border-[var(--color-border)]">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-[var(--color-brand)]" aria-hidden="true" />
          <span className="font-semibold text-[var(--color-text-primary)] tracking-tight">
            Streaks
          </span>
        </div>

        {/* User avatar + name → profile edit */}
        <Link
          href="/settings/profile"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label="Edit profile"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--color-brand)] flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          <span className="text-sm font-medium text-[var(--color-text-primary)] max-w-[120px] truncate hidden sm:block">
            {displayName}
          </span>
        </Link>
      </div>
    </header>
  );
}
