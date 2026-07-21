"use client";
import { useState } from "react";
import { useEffect } from "react";
import type { User } from "@/lib/db/schema";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Trash2, KeyRound } from "lucide-react";

type SafeUser = Omit<User, "passwordHash">;

export function UserPaidTable() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ username: "", password: "", displayName: "" });
  const [creating, setCreating] = useState(false);
  // Separate busy trackers per action — sharing one meant toggling the paid
  // checkbox also visually disabled/flashed the unrelated promote button.
  const [busyPaidId, setBusyPaidId] = useState<string | null>(null);
  const [busyRoleId, setBusyRoleId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);

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
    }
  };

  const handlePaidToggle = async (id: string, hasPaid: boolean) => {
    setBusyPaidId(id);
    await patchUser(id, { hasPaid });
    setBusyPaidId(null);
  };

  const handleRoleToggle = async (id: string, isAdmin: boolean) => {
    setBusyRoleId(id);
    await patchUser(id, { isAdmin });
    setBusyRoleId(null);
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

  const players = users.filter((u) => !u.isBootstrap);
  const paidCount = players.filter((u) => u.hasPaid).length;

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
        {paidCount} of {players.length} paid
      </p>

      <div className="space-y-2">
        {users.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            busyPaid={busyPaidId === user.id}
            busyRole={busyRoleId === user.id}
            resetting={resetId === user.id}
            onTogglePaid={(hasPaid) => handlePaidToggle(user.id, hasPaid)}
            onToggleRole={() => handleRoleToggle(user.id, !user.isAdmin)}
            onStartReset={() => setResetId(user.id)}
            onCancelReset={() => setResetId(null)}
            onSubmitReset={async (password) => {
              await patchUser(user.id, { password });
              setResetId(null);
            }}
            onDelete={() => handleDelete(user.id)}
          />
        ))}
      </div>
    </div>
  );
}

function UserRow({
  user,
  busyPaid,
  busyRole,
  resetting,
  onTogglePaid,
  onToggleRole,
  onStartReset,
  onCancelReset,
  onSubmitReset,
  onDelete,
}: {
  user: SafeUser;
  busyPaid: boolean;
  busyRole: boolean;
  resetting: boolean;
  onTogglePaid: (hasPaid: boolean) => void;
  onToggleRole: () => void;
  onStartReset: () => void;
  onCancelReset: () => void;
  onSubmitReset: (password: string) => Promise<void>;
  onDelete: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newPassword) return;
    setSubmitting(true);
    await onSubmitReset(newPassword);
    setSubmitting(false);
    setNewPassword("");
  };

  return (
    <Card>
      <CardBody className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-neutral-100 text-sm truncate">
                {user.displayName ?? user.username}
              </span>
              {user.isAdmin && <Badge variant="success">Admin</Badge>}
            </div>
            <p className="text-xs text-neutral-500">@{user.username}</p>
          </div>
          {!user.isBootstrap && (
            <label className="flex items-center gap-2 text-sm text-neutral-300 shrink-0">
              Paid
              <input
                type="checkbox"
                checked={user.hasPaid}
                disabled={busyPaid}
                onChange={(e) => onTogglePaid(e.target.checked)}
              />
            </label>
          )}
          {!user.isBootstrap && (
            <Button size="sm" variant="secondary" disabled={busyRole} onClick={onToggleRole}>
              {user.isAdmin ? "Demote" : "Promote"}
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={onStartReset} title="Reset password">
            <KeyRound size={14} />
          </Button>
          {!user.isBootstrap && (
            <Button size="sm" variant="danger" onClick={onDelete}>
              <Trash2 size={14} />
            </Button>
          )}
        </div>

        {resetting && (
          <div className="flex items-center gap-2 border-t border-white/10 pt-3">
            <Input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={handleSubmit} loading={submitting}>
              Set
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelReset}>
              Cancel
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
