"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flame, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

type Phase = "credentials" | "security";

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]).{8,128}$/;

export default function RegisterPage() {
  const [phase, setPhase] = useState<Phase>("credentials");

  // Phase 1
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Phase 2 â€” security questions
  const [sqName, setSqName] = useState("");
  const [sqPlace, setSqPlace] = useState("");
  const [sqAnimal, setSqAnimal] = useState("");
  const [sqThing, setSqThing] = useState("");

  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const validateCredentials = () => {
    if (!/^[a-z][a-z0-9_-]{2,19}$/.test(username)) {
      showToast("Username: 3-20 chars, start with a letter, only a-z 0-9 _ -", "error");
      return false;
    }
    if (!nickname.trim()) {
      showToast("Nickname is required", "error");
      return false;
    }
    if (!PASSWORD_RE.test(password)) {
      showToast("Password must be 8-128 chars with uppercase, lowercase, number, and special character", "error");
      return false;
    }
    if (password !== confirmPw) {
      showToast("Passwords do not match", "error");
      return false;
    }
    return true;
  };

  const handleNextPhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateCredentials()) setPhase("security");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sqName.trim() || !sqPlace.trim() || !sqAnimal.trim() || !sqThing.trim()) {
      showToast("All security questions are required", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          nickname: nickname.trim(),
          password,
          sq_name: sqName.trim(),
          sq_place: sqPlace.trim(),
          sq_animal: sqAnimal.trim(),
          sq_thing: sqThing.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Registration failed", "error");
      } else {
        showToast("Account created!", "success");
        router.push("/today");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--radius-2xl)] bg-[var(--color-brand-light)] mb-4">
            <Flame className="w-7 h-7 text-[var(--color-brand)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {phase === "credentials" ? "Create account" : "Security questions"}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {phase === "credentials"
              ? "Step 1 of 2 â€” Your login details"
              : "Step 2 of 2 â€” Never forget these answers"}
          </p>
        </div>

        {phase === "credentials" ? (
          <form onSubmit={handleNextPhase} noValidate className="flex flex-col gap-3">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="your_username"
                required
              />
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                3-20 chars Â· letters, numbers, _ and - Â· must start with a letter
              </p>
            </div>

            <div>
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                type="text"
                autoComplete="name"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Display name"
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
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                8-128 chars Â· uppercase, lowercase, number, special character
              </p>
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

            <Button type="submit" fullWidth className="mt-1">Next â†’</Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
            <p className="text-sm text-[var(--color-text-secondary)] -mt-2 mb-1">
              These 4 answers are used to recover your account. They are stored securely and <strong>cannot be changed</strong>.
            </p>

            {[
              { id: "sq-name",   label: "A person's name",  value: sqName,   set: setSqName },
              { id: "sq-place",  label: "A place",           value: sqPlace,  set: setSqPlace },
              { id: "sq-animal", label: "An animal",         value: sqAnimal, set: setSqAnimal },
              { id: "sq-thing",  label: "A thing",           value: sqThing,  set: setSqThing },
            ].map(({ id, label, value, set }) => (
              <div key={id}>
                <Label htmlFor={id}>{label}</Label>
                <Input
                  id={id}
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={`Your ${label.toLowerCase()}`}
                  required
                />
              </div>
            ))}

            <div className="flex gap-2 mt-1">
              <Button type="button" variant="outline" fullWidth onClick={() => setPhase("credentials")}>
                â† Back
              </Button>
              <Button type="submit" fullWidth loading={loading}>
                Create Account
              </Button>
            </div>
          </form>
        )}

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
