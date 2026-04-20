"use client";

import { useState } from "react";
import { LogOut, Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Top app bar displayed on all protected pages.
 * Shows the app brand, theme toggle, and a sign-out button.
 */
export function Header() {
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  /** Signs the user out and redirects to the login page. */
  const handleSignOut = async () => {
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
        </div>

        {/** Right actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            loading={signingOut}
            onClick={handleSignOut}
            aria-label="Sign out"
            leftIcon={!signingOut ? <LogOut className="w-4 h-4" /> : undefined}
          />
        </div>
      </div>
    </header>
  );
}
