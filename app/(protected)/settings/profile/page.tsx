"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useUser } from "@/lib/hooks/use-user";
import { getDisplayName, getInitials } from "@/lib/utils/display-name";

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export default function ProfilePage() {
  const router = useRouter();
  const { user, refetch } = useUser();
  const { showToast } = useToast();

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [usernameWarning, setUsernameWarning] = useState<string | null>(null);
  const usernameCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username ?? "");
      setBio(user.bio ?? "");
    }
  }, [user]);

  const displayName = user ? getDisplayName(user) : "â€¦";
  const initials = getInitials(displayName);
  // Debounced duplicate check for username — warning only, never blocks save
  useEffect(() => {
    if (!dirty) { setUsernameWarning(null); return; }
    const q = username.trim().toLowerCase();
    if (!USERNAME_REGEX.test(q)) { setUsernameWarning(null); return; }
    if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current);
    usernameCheckRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        const users: { username: string; created_at?: string }[] = json.users ?? [];
        const exact = users.find((u) => u.username.toLowerCase() === q);
        if (exact) {
          const theyWereFirst =
            exact.created_at && user?.created_at ? exact.created_at < user.created_at : true;
          setUsernameWarning(
            theyWereFirst ? "Someone else is also using this username. Consider a different one." : null
          );
        } else {
          setUsernameWarning(null);
        }
      } catch { setUsernameWarning(null); }
    }, 400);
    return () => { if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current); };
  }, [username, dirty, user?.created_at]);
  const handleSave = async () => {
    setLoading(true);
    const r = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), bio: bio.trim() }),
    });
    const d = await r.json();
    setLoading(false);
    if (!r.ok) {
      showToast(d.error ?? "Save failed", "error");
    } else {
      showToast("Profile saved", "success");
      await refetch();
      setDirty(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Edit Profile</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8 gap-2">
        <div className="w-20 h-20 rounded-full bg-[var(--color-brand)] flex items-center justify-center">
          <span className="text-2xl font-bold text-white">{initials}</span>
        </div>
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{displayName}</p>
      </div>

      <div className="space-y-5">
        {/* Username */}
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setDirty(true); }}
            placeholder="Enter a username"
            maxLength={50}
          />          {usernameWarning && (
            <p className="text-xs text-amber-500 px-1">{usernameWarning}</p>
          )}          <p className="text-xs text-[var(--color-text-secondary)]">Your display name across the app.</p>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => { setBio(e.target.value); setDirty(true); }}
            rows={3}
            maxLength={200}
            placeholder="A short description about yourself"
            className="w-full px-3 py-2 text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] resize-none"
          />
          <p className="text-xs text-[var(--color-text-secondary)]">{bio.length}/200</p>
        </div>

        {/* Save */}
        <div className="pt-2">
          <Button
            type="button"
            className="w-full"
            loading={loading}
            disabled={!dirty}
            onClick={handleSave}
            leftIcon={<Check className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

