"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { Flame, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]).{8,128}$/;

export default function ForgotPasswordPage() {
  const [phase, setPhase] = useState<"verify" | "reset" | "done">("verify");
  const [username, setUsername] = useState("");
  const [sqName, setSqName] = useState("");
  const [sqPlace, setSqPlace] = useState("");
  const [sqAnimal, setSqAnimal] = useState("");
  const [sqThing, setSqThing] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.toLowerCase().trim(),
          sq_name: sqName, sq_place: sqPlace, sq_animal: sqAnimal, sq_thing: sqThing,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Verification failed", "error"); }
      else { setResetToken(data.reset_token); setPhase("reset"); }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PASSWORD_RE.test(newPassword)) {
      return showToast("Password doesn't meet the requirements", "error");
    }
    if (newPassword !== confirmPw) return showToast("Passwords do not match", "error");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset_token: resetToken, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Reset failed", "error"); }
      else { setPhase("done"); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--radius-xl)] bg-[var(--color-brand-light)] mb-4">
            <Flame className="w-7 h-7 text-[var(--color-brand)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Reset password</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {phase === "verify" ? "Answer your security questions" :
             phase === "reset" ? "Set a new password" : "Password updated!"}
          </p>
        </div>

        {phase === "done" ? (
          <div className="text-center space-y-4">
            <p className="text-[var(--color-text-secondary)]">Your password has been reset successfully.</p>
            <Link href="/login" className="block">
              <Button className="w-full">Back to Login</Button>
            </Link>
          </div>
        ) : phase === "verify" ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fp-username">Username</Label>
              <Input id="fp-username" type="text" autoCapitalize="none"
                value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            {[
              { label: "What is your name?", val: sqName, set: setSqName, id: "fp-name" },
              { label: "What is your favourite place?", val: sqPlace, set: setSqPlace, id: "fp-place" },
              { label: "What is your favourite animal?", val: sqAnimal, set: setSqAnimal, id: "fp-animal" },
              { label: "What is your favourite thing?", val: sqThing, set: setSqThing, id: "fp-thing" },
            ].map(({ label, val, set, id }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Input id={id} type="text" value={val} onChange={(e) => set(e.target.value)} required />
              </div>
            ))}
            <Button type="submit" className="w-full" loading={loading}>Verify</Button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">New password</Label>
              <div className="relative">
                <Input id="new-pw" type={showPw ? "text" : "password"} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} required className="pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                8-128 chars, uppercase, lowercase, number, special character
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw">Confirm new password</Label>
              <Input id="confirm-pw" type="password" value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" loading={loading}>Reset Password</Button>
          </form>
        )}

        <p className="text-center text-sm text-[var(--color-text-secondary)] mt-6">
          <Link href="/login" className="text-[var(--color-brand)] hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
