"use client";

import { useState } from "react";
import { Flame, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface HabitSuggestion { title: string; priority: number; is_recurring: boolean; active_days: number[]; allow_grace: boolean; }

const SUGGESTIONS: HabitSuggestion[] = [
  { title: "Morning walk",             priority: 2, is_recurring: true, active_days: [1,2,3,4,5],     allow_grace: true  },
  { title: "Read for 20 minutes",      priority: 3, is_recurring: true, active_days: [0,1,2,3,4,5,6], allow_grace: true  },
  { title: "Drink 8 glasses of water", priority: 2, is_recurring: true, active_days: [0,1,2,3,4,5,6], allow_grace: true  },
  { title: "No phone before 9am",      priority: 1, is_recurring: true, active_days: [0,1,2,3,4,5,6], allow_grace: false },
  { title: "Evening journal",          priority: 4, is_recurring: true, active_days: [0,1,2,3,4,5,6], allow_grace: true  },
];

async function getUsername(): Promise<string> {
  try { const r = await fetch("/api/profile"); const j = await r.json(); return (j.user?.username as string | undefined) ?? "there"; }
  catch { return "there"; }
}

export default function WelcomeOnboardingPage() {
  const [step, setStep] = useState<1|2|3>(1);
  const [username, setUsername] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [finishing, setFinishing] = useState(false);

  useState(() => { getUsername().then(setUsername); });

  const toggleHabit = (i: number) => setSelected((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const handleAddSelected = async () => {
    if (selected.size === 0) { setStep(3); return; }
    setAdding(true);
    try {
      await Promise.all([...selected].map((i) => fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "task", ...SUGGESTIONS[i] }) })));
      setAddedCount(selected.size);
    } finally { setAdding(false); setStep(3); }
  };

  const handleFinish = async () => {
    setFinishing(true);
    try { await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ onboarding_complete: true }) }); } catch {}
    window.location.href = "/today";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-2 mb-10">
        <Flame className="w-6 h-6 text-[var(--color-brand)]" />
        <span className="font-semibold text-lg text-[var(--color-text-primary)] tracking-tight">Streaks</span>
      </div>
      <div className="w-full max-w-sm">
        {step === 1 && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Welcome to Streaks{username ? `, @${username}` : ""}</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">Let us set up your first habits.</p>
            </div>
            <button onClick={() => setStep(2)} className="w-full py-3 rounded-xl font-semibold text-sm text-white" style={{ backgroundColor: "var(--color-brand)" }}>Get started</button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-1 text-center">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Pick habits to start with</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">You can always add more later.</p>
            </div>
            <div className="space-y-2">
              {SUGGESTIONS.map((h, i) => {
                const isSel = selected.has(i);
                return (
                  <button key={i} onClick={() => toggleHabit(i)} className={cn("w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-colors", isSel ? "border-[var(--color-brand)] bg-[var(--color-brand)]/5" : "border-[var(--color-border)] bg-[var(--color-surface-raised)]")}>
                    <span className={cn("text-sm font-medium", isSel ? "text-[var(--color-brand)]" : "text-[var(--color-text-primary)]")}>{h.title}</span>
                    {isSel && <Check className="w-4 h-4 text-[var(--color-brand)] shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl font-semibold text-sm border border-[var(--color-border)] text-[var(--color-text-secondary)]">Skip</button>
              <button onClick={handleAddSelected} disabled={adding} className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50" style={{ backgroundColor: "var(--color-brand)" }}>
                {adding ? "Adding…" : selected.size > 0 ? `Add selected (${selected.size})` : "Add selected"}
              </button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <div className="text-4xl mb-3">🎉</div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">You are all set.</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">{addedCount > 0 ? `We added ${addedCount} habit${addedCount === 1 ? "" : "s"} to your Today view.` : "Create your first habit from the Habits tab anytime."}</p>
            </div>
            <button onClick={handleFinish} disabled={finishing} className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50" style={{ backgroundColor: "var(--color-brand)" }}>
              {finishing ? "Going…" : "Go to Today"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
