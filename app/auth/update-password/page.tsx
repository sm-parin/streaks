"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Flame, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const { showToast } = useToast();

  // Supabase sets the session automatically when the recovery link is clicked.
  // If there is no session here, send the user to forgot-password.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = "/forgot-password";
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }
    if (password !== confirmPw) {
      showToast("Passwords do not match", "error");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        showToast(error.message, "error");
      } else {
        setDone(true);
        setTimeout(() => { window.location.href = "/login"; }, 2000);
      }
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)]">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--radius-2xl)] bg-[var(--color-brand-light)] mb-6">
            <Flame className="w-7 h-7 text-[var(--color-brand)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Password updated</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">Redirecting you to sign in...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--radius-2xl)] bg-[var(--color-brand-light)] mb-4">
            <Flame className="w-7 h-7 text-[var(--color-brand)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Set new password</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Choose a strong password</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          <div>
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Re-enter password"
              required
            />
          </div>

          <Button type="submit" fullWidth loading={loading} className="mt-1">
            Update password
          </Button>
        </form>
      </div>
    </main>
  );
}
