"use client";
import { useState } from "react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/db/schema";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Trash2, KeyRound, ShieldPlus, ShieldMinus, MoreVertical, X } from "lucide-react";
import { useScrollLock } from "@/lib/useScrollLock";

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
            onTogglePaid={(hasPaid) => handlePaidToggle(user.id, hasPaid)}
            onToggleRole={() => handleRoleToggle(user.id, !user.isAdmin)}
            onSubmitReset={(password) => patchUser(user.id, { password })}
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
  onTogglePaid,
  onToggleRole,
  onSubmitReset,
  onDelete,
}: {
  user: SafeUser;
  busyPaid: boolean;
  busyRole: boolean;
  onTogglePaid: (hasPaid: boolean) => void;
  onToggleRole: () => void;
  onSubmitReset: (password: string) => Promise<void>;
  onDelete: () => void;
}) {
  // All the rarely-used, name-crowding actions (promote/demote, reset password,
  // remove) live behind this kebab in a popup, leaving only the paid checkbox
  // inline so the row stays readable even with long names.
  const [menuOpen, setMenuOpen] = useState(false);

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
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Manage user"
            aria-haspopup="dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-white/5 active:scale-95"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </CardBody>

      {menuOpen && (
        <UserActionsPopup
          user={user}
          busyRole={busyRole}
          onToggleRole={onToggleRole}
          onSubmitReset={onSubmitReset}
          onDelete={onDelete}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </Card>
  );
}

function UserActionsPopup({
  user,
  busyRole,
  onToggleRole,
  onSubmitReset,
  onDelete,
  onClose,
}: {
  user: SafeUser;
  busyRole: boolean;
  onToggleRole: () => void;
  onSubmitReset: (password: string) => Promise<void>;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useScrollLock();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleReset = async () => {
    if (!newPassword) return;
    setSubmitting(true);
    await onSubmitReset(newPassword);
    setSubmitting(false);
    onClose();
  };

  const name = user.displayName ?? user.username;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Tapping the scrim (anywhere outside the card) closes the popup. */}
      <div className="absolute inset-x-0 -inset-y-full bg-black/85" onClick={onClose} />
      <div className="relative flex w-full max-w-xs flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-neutral-50">{name}</h2>
            <p className="truncate text-xs text-neutral-500">@{user.username}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-neutral-400"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {resetting ? (
          <div className="flex flex-col gap-2 border-t border-white/10 px-5 py-4">
            <Input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleReset} loading={submitting} className="flex-1">
                Set password
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setResetting(false);
                  setNewPassword("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col border-t border-white/10 py-1">
            {!user.isBootstrap && (
              <ActionItem
                icon={user.isAdmin ? <ShieldMinus size={16} /> : <ShieldPlus size={16} />}
                label={user.isAdmin ? "Remove admin" : "Make admin"}
                disabled={busyRole}
                onClick={() => {
                  onToggleRole();
                  onClose();
                }}
              />
            )}
            <ActionItem icon={<KeyRound size={16} />} label="Reset password" onClick={() => setResetting(true)} />
            {!user.isBootstrap && (
              <ActionItem
                icon={<Trash2 size={16} />}
                label="Remove user"
                danger
                onClick={() => {
                  onDelete();
                  onClose();
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionItem({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 px-5 py-3 text-left text-sm font-medium transition-colors disabled:opacity-50",
        danger ? "text-danger hover:bg-danger/10" : "text-neutral-200 hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
