"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useUser } from "@/lib/hooks/use-user";

export default function ProfilePage() {
  const router = useRouter();
  const { user, refetch } = useUser();
  const { showToast } = useToast();

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username ?? "");
      setBio(user.bio ?? "");
    }
  }, [user]);

  const displayName = user?.username || user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

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
      <div className="flex justify-center mb-8">
        <div className="w-20 h-20 rounded-full bg-[var(--color-brand)] flex items-center justify-center">
          <span className="text-2xl font-bold text-white">{initials}</span>
        </div>
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
          />
          <p className="text-xs text-[var(--color-text-secondary)]">Not unique — just a display name.</p>
        </div>

        {/* Email (read-only) */}
        <div className="space-y-1.5">
          <Label>Email</Label>
          <div className="px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] select-none">
            {user?.email ?? "—"}
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">Email cannot be changed.</p>
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

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              setUsername(user?.username ?? "");
              setBio(user?.bio ?? "");
              setDirty(false);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            loading={loading}
            disabled={!dirty}
            onClick={handleSave}
            leftIcon={<Check className="w-4 h-4" />}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
