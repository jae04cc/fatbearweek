"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PawPrint, Lock, FileText, Users, GitBranch } from "lucide-react";
import { BearEditor } from "@/components/admin/BearEditor";
import { LockPanel } from "@/components/admin/LockPanel";
import { BracketSetup } from "@/components/admin/BracketSetup";
import { HomeContentEditor } from "@/components/admin/HomeContentEditor";
import { UserPaidTable } from "@/components/admin/UserPaidTable";
import { SignupCodePanel } from "@/components/admin/SignupCodePanel";

type Tab = "bears" | "setup" | "lock" | "home" | "users";

const TABS: { id: Tab; label: string; icon: typeof PawPrint }[] = [
  { id: "bears", label: "Bears", icon: PawPrint },
  { id: "setup", label: "Setup", icon: GitBranch },
  { id: "lock", label: "Lock", icon: Lock },
  { id: "home", label: "Home", icon: FileText },
  { id: "users", label: "Users", icon: Users },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("bears");

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-5 pt-10 pb-4 text-center">
        <h1 className="text-2xl font-black text-neutral-50">Admin</h1>
      </header>

      <div className="px-5 pb-4">
        <div className="flex gap-1 rounded-xl bg-surface-card p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors",
                activeTab === id ? "bg-surface-elevated text-white" : "text-neutral-500"
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-5 pb-10">
        {activeTab === "bears" && <BearEditor />}
        {activeTab === "setup" && <BracketSetup />}
        {activeTab === "lock" && <LockPanel />}
        {activeTab === "home" && <HomeContentEditor />}
        {activeTab === "users" && (
          <div className="space-y-4">
            <SignupCodePanel />
            <UserPaidTable />
          </div>
        )}
      </main>
    </div>
  );
}
