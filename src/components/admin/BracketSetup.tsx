"use client";
import { useEffect, useState } from "react";
import type { Bear } from "@/lib/db/schema";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Round1Slot {
  bearAId: string;
  bearBId: string;
}

export function BracketSetup() {
  const [bears, setBears] = useState<Bear[]>([]);
  const [loading, setLoading] = useState(true);
  const [round1, setRound1] = useState<Round1Slot[]>([
    { bearAId: "", bearBId: "" },
    { bearAId: "", bearBId: "" },
    { bearAId: "", bearBId: "" },
    { bearAId: "", bearBId: "" },
  ]);
  const [round2Byes, setRound2Byes] = useState<string[]>(["", "", "", ""]);
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/bears")
      .then((r) => r.json())
      .then((data: Bear[]) => {
        setBears(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const nonByeBears = bears.filter((b) => !b.isBye);
  const byeBears = bears.filter((b) => b.isBye);
  const ready = nonByeBears.length === 8 && byeBears.length === 4;

  const handleSeed = async (force: boolean) => {
    setMessage(null);

    const selections = [
      ...round1.flatMap((s) => [s.bearAId, s.bearBId]),
      ...round2Byes,
    ];
    if (selections.some((id) => !id)) {
      setMessage({ type: "error", text: "Fill in every matchup slot before seeding." });
      return;
    }
    if (new Set(selections).size !== selections.length) {
      setMessage({ type: "error", text: "Each bear can only be placed in one slot." });
      return;
    }
    if (force && !confirm("Reseed the bracket? This discards any recorded round results.")) return;

    setSeeding(true);
    try {
      const res = await fetch(`/api/admin/bracket/seed${force ? "?force=true" : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round1: round1.map((s, i) => ({ position: i + 1, bearAId: s.bearAId, bearBId: s.bearBId })),
          round2Byes: round2Byes.map((bearId, i) => ({ position: i + 1, bearId })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to seed bracket");
      setMessage({ type: "success", text: "Bracket seeded successfully." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to seed bracket" });
    } finally {
      setSeeding(false);
    }
  };

  const handleReset = async () => {
    setMessage(null);
    if (
      !confirm(
        "Reset for a new season? This permanently deletes every bear (and their photos), the whole bracket, and everyone's picks. This cannot be undone."
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/admin/bracket/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to reset");
      setBears([]);
      setMessage({ type: "success", text: `Reset complete — ${body.bearsDeleted} bears and the bracket were removed.` });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to reset" });
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="space-y-4">
        <Card>
          <CardBody className="text-sm text-neutral-400">
            Add all 12 bears first (8 regular + 4 with a bye) in the Bears tab before setting up the bracket.
            Currently: {nonByeBears.length}/8 regular, {byeBears.length}/4 byes.
          </CardBody>
        </Card>
        {bears.length > 0 && (
          <ResetSeasonPanel resetting={resetting} onReset={handleReset} />
        )}
        {message && <StatusMessage message={message} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="gap-3">
          <p className="font-semibold text-neutral-100">Round 1 matchups</p>
          <p className="text-sm text-neutral-400">
            Set these to match the real published bracket exactly — this isn't randomized or auto-paired.
          </p>
          {round1.map((slot, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-xs text-neutral-500">#{i + 1}</span>
              <BearSelect
                bears={nonByeBears}
                value={slot.bearAId}
                onChange={(id) => setRound1((prev) => prev.map((s, idx) => (idx === i ? { ...s, bearAId: id } : s)))}
              />
              <span className="text-xs text-neutral-500">vs</span>
              <BearSelect
                bears={nonByeBears}
                value={slot.bearBId}
                onChange={(id) => setRound1((prev) => prev.map((s, idx) => (idx === i ? { ...s, bearBId: id } : s)))}
              />
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="gap-3">
          <p className="font-semibold text-neutral-100">Round 2 byes</p>
          <p className="text-sm text-neutral-400">Which bye bear faces the winner of each Round 1 matchup above.</p>
          {round2Byes.map((bearId, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs text-neutral-500">Winner of #{i + 1} faces</span>
              <BearSelect
                bears={byeBears}
                value={bearId}
                onChange={(id) => setRound2Byes((prev) => prev.map((b, idx) => (idx === i ? id : b)))}
              />
            </div>
          ))}
        </CardBody>
      </Card>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => handleSeed(false)} loading={seeding}>
          Seed bracket
        </Button>
        <Button size="sm" variant="danger" onClick={() => handleSeed(true)} loading={seeding}>
          Force reseed
        </Button>
      </div>

      {message && <StatusMessage message={message} />}

      <ResetSeasonPanel resetting={resetting} onReset={handleReset} />
    </div>
  );
}

function ResetSeasonPanel({ resetting, onReset }: { resetting: boolean; onReset: () => void }) {
  return (
    <Card className="border-danger/30">
      <CardBody className="gap-2">
        <p className="font-semibold text-danger">Danger zone</p>
        <p className="text-sm text-neutral-400">
          Starting a new season? This permanently deletes every bear (and their photos), the whole bracket, and
          everyone's picks — nothing else is touched.
        </p>
        <Button size="sm" variant="danger" onClick={onReset} loading={resetting} className="self-start">
          Reset for a new season
        </Button>
      </CardBody>
    </Card>
  );
}

function StatusMessage({ message }: { message: { type: "error" | "success"; text: string } }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        message.type === "error" ? "border-danger/30 bg-danger/10 text-danger" : "border-success/30 bg-success/10 text-success"
      }`}
    >
      {message.text}
    </div>
  );
}

function BearSelect({
  bears,
  value,
  onChange,
}: {
  bears: Bear[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-[44px] flex-1 rounded-xl border border-white/10 bg-surface-elevated px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <option value="">Select a bear…</option>
      {bears.map((bear) => (
        <option key={bear.id} value={bear.id}>
          {bear.name} (#{bear.number})
        </option>
      ))}
    </select>
  );
}
