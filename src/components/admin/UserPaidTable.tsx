"use client";
import { useEffect, useState } from "react";
import type { User } from "@/lib/db/schema";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Trash2 } from "lucide-react";

type SafeUser = Omit<User, "passwordHash">;

export function UserPaidTable() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ username: "", password: "", displayName: "" });
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data: SafeUser[]) => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    if (!newUser.username.trim() || !newUser.password) return;
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to create user");
      setNewUser({ username: "", password: "", displayName: "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const patchUser = async (id: string, patch: Record<string, unknown>) => {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to update user");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this user from the pool? This deletes their bracket picks too.")) return;
    setError(null);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError((await res.json().catch(() => ({})))?.error ?? "Failed to delete user");
      return;
    }
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const paidCount = users.filter((u) => u.hasPaid).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="gap-3">
          <p className="text-sm font-semibold text-neutral-300">Add a pool member</p>
          <Input
            placeholder="Username"
            value={newUser.username}
            onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))}
          />
          <Input
            placeholder="Display name (optional)"
            value={newUser.displayName}
            onChange={(e) => setNewUser((p) => ({ ...p, displayName: e.target.value }))}
          />
          <Input
            placeholder="Password"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
          />
          <Button size="sm" onClick={handleCreate} loading={creating}>
            Add member
          </Button>
        </CardBody>
      </Card>

      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

      <p className="text-sm text-neutral-400">
        {paidCount} of {users.length} paid
      </p>

      <div className="space-y-2">
        {users.map((user) => (
          <Card key={user.id}>
            <CardBody className="flex-row items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-neutral-100 text-sm truncate">
                    {user.displayName ?? user.username}
                  </span>
                  {user.isAdmin && <Badge variant="success">Admin</Badge>}
                </div>
                <p className="text-xs text-neutral-500">@{user.username}</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-300 shrink-0">
                Paid
                <input
                  type="checkbox"
                  checked={user.hasPaid}
                  disabled={busyId === user.id}
                  onChange={(e) => patchUser(user.id, { hasPaid: e.target.checked })}
                />
              </label>
              <Button
                size="sm"
                variant="secondary"
                disabled={busyId === user.id}
                onClick={() => patchUser(user.id, { isAdmin: !user.isAdmin })}
              >
                {user.isAdmin ? "Demote" : "Promote"}
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(user.id)}>
                <Trash2 size={14} />
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
