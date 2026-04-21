"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      });
      if (error) {
        showToast(error.message, "error");
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
            We sent a password reset link to <strong>{email}</strong>.
          </p>
          <Link href="/login" className="inline-block mt-6 text-sm text-[var(--color-brand)] hover:underline">
            Back to sign in
          </Link>
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
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Forgot password?</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Enter your email and we will send a reset link
          </p>
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

          <Button type="submit" fullWidth loading={loading} className="mt-1">
            Send reset link
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--color-text-secondary)] mt-5">
          <Link href="/login" className="text-[var(--color-brand)] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
