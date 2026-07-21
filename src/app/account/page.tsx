"use client";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LogOut } from "lucide-react";

export default function AccountPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(session?.user.displayName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSaveName = async () => {
    setNameError(null);
    setSavingName(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to save");
      await update({ displayName });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2500);
    } catch (e) {
      setNameError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePassword = async () => {
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to save");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2500);
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-black text-neutral-50">Account</h1>
        <p className="text-sm text-neutral-400 mt-0.5">@{session?.user.name ?? ""}</p>
      </header>

      <main className="flex-1 px-5 pb-10 space-y-4">
        <Card>
          <CardBody className="gap-3">
            <p className="font-semibold text-neutral-100">Display name</p>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
            {nameError && <p className="text-sm text-danger">{nameError}</p>}
            <Button size="sm" onClick={handleSaveName} loading={savingName} className="self-start">
              {nameSaved ? "Saved!" : "Save"}
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="gap-3">
            <p className="font-semibold text-neutral-100">Change password</p>
            <Input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
            <Button size="sm" onClick={handleSavePassword} loading={savingPassword} className="self-start">
              {passwordSaved ? "Saved!" : "Save"}
            </Button>
          </CardBody>
        </Card>

        <Button variant="secondary" onClick={handleLogout} className="w-full">
          <LogOut size={16} />
          Log out
        </Button>
      </main>
    </div>
  );
}
