"use client";

import { useState } from "react";
import { LogOut, FlaskConical, Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { IS_DEV_MODE } from "@/lib/dev/is-dev-mode";

/**
 * Top app bar displayed on all protected pages.
 * Shows the app brand, theme toggle, and a sign-out button.
 * In dev mode the sign-out button is replaced with a "Dev" badge.
 */
export function Header() {
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  /**
   * Signs the user out and redirects to the login page.
   * No-op in dev mode.
   */
  const handleSignOut = async () => {
    if (IS_DEV_MODE) return;
    setSigningOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast(error.message, "error");
      setSigningOut(false);
    } else {
      router.push("/login");
    }
  };

  return (
    <header className="sticky top-0 z-[200] w-full bg-[var(--color-bg)]/90 backdrop-blur-md border-b border-[var(--color-border)]">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/** Brand */}
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-[var(--color-brand)]" aria-hidden="true" />
          <span className="font-semibold text-[var(--color-text-primary)] tracking-tight">
            Streaks
          </span>
          {IS_DEV_MODE && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning)] leading-none">
              DEV
            </span>
          )}
        </div>

        {/** Right actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {IS_DEV_MODE ? (
            <span
              title="Authentication is disabled in dev mode"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
            >
              <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
              Mock user
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              loading={signingOut}
              onClick={handleSignOut}
              aria-label="Sign out"
              leftIcon={!signingOut ? <LogOut className="w-4 h-4" /> : undefined}
            />
          )}
        </div>
      </div>
    </header>
  );
}
