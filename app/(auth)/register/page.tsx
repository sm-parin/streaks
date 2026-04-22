"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { Flame, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { showToast } = useToast();

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        showToast(error.message, "error");
      } else {
        showToast("Confirmation email resent", "success");
        setResendCooldown(60);
        const interval = setInterval(() => {
          setResendCooldown((c) => {
            if (c <= 1) { clearInterval(interval); return 0; }
            return c - 1;
          });
        }, 1000);
      }
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
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
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        showToast(error.message, "error");
        return;
      }
      if (data.session) {
        window.location.href = "/today";
      } else {
        setDone(true);
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
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Check your email</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account.
          </p>
          <button
            onClick={handleResend}
            disabled={resendLoading || resendCooldown > 0}
            className="mt-5 text-sm text-[var(--color-brand)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendLoading
              ? "Sending..."
              : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Didn't get it? Resend email"}
          </button>
          <p className="text-sm text-[var(--color-text-secondary)] mt-4">
            Already confirmed?{" "}
            <Link href="/login" className="text-[var(--color-brand)] font-medium hover:underline">
              Sign in
            </Link>
          </p>
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
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Create account</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Start building your streaks</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
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
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--color-text-secondary)] mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--color-brand)] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
