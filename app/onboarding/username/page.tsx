"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Flame } from "lucide-react";

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
type Validity = "idle" | "checking" | "invalid-format" | "available" | "taken";

export default function UsernameOnboardingPage() {
  const [value, setValue] = useState("");
  const [validity, setValidity] = useState<Validity>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validate = useCallback(async (raw: string) => {
    const v = raw.trim().toLowerCase();
    if (v.length === 0) { setValidity("idle"); return; }
    if (!USERNAME_REGEX.test(v)) { setValidity("invalid-format"); return; }
    setValidity("checking");
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(v)}`);
      const json = await res.json();
      const users: { username: string }[] = json.users ?? [];
      setValidity(users.some((u) => u.username.toLowerCase() === v) ? "taken" : "available");
    } catch { setValidity("idle"); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => validate(value), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, validate]);

  const canSubmit = validity === "available" && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: value.trim().toLowerCase() }) });
      if (res.status === 409) { setValidity("taken"); return; }
      if (!res.ok) { const j = await res.json(); setSubmitError(j.error ?? "Something went wrong."); return; }
      window.location.href = "/onboarding/welcome";
    } finally { setSubmitting(false); }
  };

  const hint =
    validity === "invalid-format" ? { text: "3–20 chars, letters, numbers and _ only", color: "text-red-500" } :
    validity === "checking"       ? { text: "Checking…", color: "text-[var(--color-text-secondary)]" } :
    validity === "available"      ? { text: "Available ✓", color: "text-green-500" } :
    validity === "taken"          ? { text: "Username taken", color: "text-red-500" } : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-2 mb-10">
        <Flame className="w-6 h-6 text-[var(--color-brand)]" />
        <span className="font-semibold text-lg text-[var(--color-text-primary)] tracking-tight">Streaks</span>
      </div>
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Choose your username</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">How friends find you on Streaks.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder="@username" autoComplete="off" autoCapitalize="none" spellCheck={false}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] text-sm" />
            {hint && <p className={`text-xs px-1 ${hint.color}`}>{hint.text}</p>}
            {submitError && <p className="text-xs px-1 text-red-500">{submitError}</p>}
          </div>
          <button type="submit" disabled={!canSubmit} className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity disabled:opacity-40" style={{ backgroundColor: "var(--color-brand)" }}>
            {submitting ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
