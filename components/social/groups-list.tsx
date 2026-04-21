"use client";
import { useState, useEffect, useCallback } from "react";
import { Shield, Plus, Users } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import type { Group } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export function GroupsList() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/social/groups");
    if (r.ok) { const d = await r.json(); setGroups(d.groups ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const r = await fetch("/api/social/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: desc || undefined }),
    });
    setCreating(false);
    if (!r.ok) { const d = await r.json(); showToast(d.error ?? "Failed", "error"); return; }
    showToast("Group created!", "success");
    setShowCreate(false); setName(""); setDesc(""); load();
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase">My Groups</span>
        <Button size="sm" variant="outline" onClick={() => setShowCreate((v) => !v)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
          New
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={createGroup} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-3 mb-3 space-y-3">
          <div className="space-y-1"><Label htmlFor="g-name">Group name</Label><Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="space-y-1"><Label htmlFor="g-desc">Description (optional)</Label><Input id="g-desc" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button><Button type="submit" size="sm" loading={creating}>Create</Button></div>
        </form>
      )}

      {groups.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No groups yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <div key={g.id} className={cn(
              "bg-[var(--color-surface)] border rounded-[var(--radius-lg)] p-3",
              g.my_status === "pending" ? "border-[var(--color-warning)]" : "border-[var(--color-border)]"
            )}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[var(--color-text-secondary)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{g.name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] capitalize">
                    {g.my_role} Γö¼Γòû {g.my_status === "pending" ? "Invite pending" : "Active"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
