"use client";
import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";

export function LockPanel() {
  const [bracketLocked, setBracketLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setBracketLocked(data.bracketLocked ?? false);
        setLoading(false);
      });
  }, []);

  const handleToggle = async (next: boolean) => {
    setToggling(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bracketLocked: next }),
      });
      if (!res.ok) throw new Error("Failed to update lock state");
      setBracketLocked(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-neutral-100">Bracket lock</p>
            <p className="text-sm text-neutral-400">
              {bracketLocked
                ? "Locked — nobody, including admins, can change picks."
                : "Unlocked — everyone can fill in or edit their bracket."}
            </p>
          </div>
          <Toggle checked={bracketLocked} onChange={handleToggle} disabled={toggling} label="Bracket lock" />
        </CardBody>
      </Card>

      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
    </div>
  );
}
