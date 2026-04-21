"use client";
import { useState } from "react";
import { LogOut, Monitor, User, Lock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useUser, setUser } from "@/lib/hooks/use-user";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TAB_COLORS } from "@/lib/types";

export default function SettingsPage() {
  const { user } = useUser();
  const { showToast } = useToast();

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) return showToast("Password must be at least 8 characters", "error");
    if (newPw !== confirmPw) return showToast("Passwords do not match", "error");
    setPwLoading(true);
    const r = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
    });
    const d = await r.json();
    setPwLoading(false);
    if (!r.ok) showToast(d.error ?? "Password change failed", "error");
    else { showToast("Password updated", "success"); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/login";
  };

  const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[var(--color-text-secondary)]" />
        <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">{title}</h2>
      </div>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 space-y-4">
        {children}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Settings" accentColor={TAB_COLORS.settings} />

      <Section icon={User} title="Account">
        <div className="space-y-1">
          <Label>Email</Label>
          <p className="text-sm text-[var(--color-text-primary)] bg-[var(--color-bg-secondary)] px-3 py-2 rounded-[var(--radius-md)]">
            {user?.email ?? "—"}
          </p>
        </div>
      </Section>

      <Section icon={Lock} title="Password">
        <form onSubmit={handlePasswordSave} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="cur-pw">Current password</Label>
            <Input id="cur-pw" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-pw">New password</Label>
            <Input id="new-pw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="conf-pw">Confirm new password</Label>
            <Input id="conf-pw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
          </div>
          <Button type="submit" size="sm" loading={pwLoading}>Change Password</Button>
        </form>
      </Section>

      <Section icon={Monitor} title="Appearance">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Theme</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Light, dark, or system preference</p>
          </div>
          <ThemeToggle />
        </div>
      </Section>

      <div className="mt-8">
        <Button variant="ghost" className="w-full text-[var(--color-error)] hover:bg-[var(--color-error-bg)]"
          onClick={handleLogout}
          leftIcon={<LogOut className="w-4 h-4" />}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
