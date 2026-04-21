"use client";
import { useState } from "react";
import { Search, UserPlus, UserCheck, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useUser } from "@/lib/hooks/use-user";

export function FindFriends() {
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ user: { id: string; username: string; nickname: string; avatar_url: string | null }; friendship: { status: string } | null } | null>(null);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const { showToast } = useToast();

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResult(null);
    const r = await fetch(`/api/users/${query.toLowerCase().trim()}`);
    setSearching(false);
    if (!r.ok) { showToast("User not found", "error"); return; }
    setResult(await r.json());
  };

  const sendRequest = async () => {
    if (!result) return;
    setAdding(true);
    const r = await fetch("/api/social/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: result.user.username }),
    });
    const d = await r.json();
    setAdding(false);
    if (!r.ok) { showToast(d.error ?? "Failed", "error"); return; }
    showToast("Friend request sent!", "success");
    setResult((prev) => prev ? { ...prev, friendship: { status: "pending" } } : null);
  };

  const isSelf = result?.user.id === user?.id;
  const hasRequest = result?.friendship?.status === "pending" || result?.friendship?.status === "accepted";

  return (
    <div>
      <form onSubmit={search} className="flex gap-2 mb-4">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by username..." className="flex-1" />
        <Button type="submit" loading={searching} leftIcon={<Search className="w-4 h-4" />}>Find</Button>
      </form>

      {result && !isSelf && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-brand-light)] flex items-center justify-center text-sm font-bold text-[var(--color-brand)]">
            {result.user.nickname[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{result.user.nickname}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">@{result.user.username}</p>
          </div>
          {!hasRequest ? (
            <Button size="sm" onClick={sendRequest} loading={adding} leftIcon={<UserPlus className="w-4 h-4" />}>
              Add
            </Button>
          ) : (
            <div className="flex items-center gap-1 text-xs text-[var(--color-success)] font-medium">
              <UserCheck className="w-4 h-4" />
              {result.friendship!.status === "accepted" ? "Friends" : "Requested"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
