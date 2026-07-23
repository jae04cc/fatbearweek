"use client";
import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";

type ToggleKey = "bracketLocked" | "bearsRevealed" | "bracketRevealed";

export function LockPanel() {
  const [bracketLocked, setBracketLocked] = useState(false);
  const [bearsRevealed, setBearsRevealed] = useState(false);
  const [bracketRevealed, setBracketRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setBracketLocked(data.bracketLocked ?? false);
        setBearsRevealed(data.bearsRevealed ?? false);
        setBracketRevealed(data.bracketRevealed ?? false);
        setLoading(false);
      });

  useEffect(() => {
    load();
  }, []);

  const handleToggle = async (key: ToggleKey, next: boolean) => {
    setToggling(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to update");
      // Re-fetch rather than assume — turning bears off cascades the
      // bracket reveal off server-side too, so this keeps both in sync.
      await load();
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
            <p className="font-semibold text-neutral-100">Reveal bears</p>
            <p className="text-sm text-neutral-400">
              {bearsRevealed
                ? "Revealed — players can see the bears roster."
                : "Hidden — players see a placeholder while you add bears. Admins always see the real roster."}
            </p>
          </div>
          <Toggle
            checked={bearsRevealed}
            onChange={(next) => handleToggle("bearsRevealed", next)}
            disabled={toggling}
            label="Reveal bears"
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-neutral-100">Reveal bracket</p>
            <p className="text-sm text-neutral-400">
              {!bearsRevealed
                ? "Reveal the bears first — the bracket is full of their names and photos."
                : bracketRevealed
                  ? "Revealed — players can see the bracket, Round Matchups, and the results bracket."
                  : "Hidden — players see a placeholder on those pages. Admins always see the real thing."}
            </p>
          </div>
          <Toggle
            checked={bracketRevealed}
            onChange={(next) => handleToggle("bracketRevealed", next)}
            disabled={toggling || !bearsRevealed}
            label="Reveal bracket"
          />
        </CardBody>
      </Card>

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
          <Toggle
            checked={bracketLocked}
            onChange={(next) => handleToggle("bracketLocked", next)}
            disabled={toggling}
            label="Bracket lock"
          />
        </CardBody>
      </Card>

      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
    </div>
  );
}
