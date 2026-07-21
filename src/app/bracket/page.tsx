"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import type { Bear, Matchup } from "@/lib/db/schema";
import { resolveContestants, pruneInvalidPicks } from "@/lib/bracket/topology";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

const ROUND_LABELS: Record<number, string> = {
  1: "Round 1",
  2: "Round 2",
  3: "Final Four",
  4: "Championship",
};

export default function BracketPage() {
  const [bears, setBears] = useState<Bear[]>([]);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [bracketLocked, setBracketLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/bears").then((r) => r.json()), fetch("/api/bracket").then((r) => r.json())]).then(
      ([bearsData, bracketData]) => {
        setBears(Array.isArray(bearsData) ? bearsData : []);
        setMatchups(bracketData.matchups ?? []);
        setPicks(bracketData.picks ?? {});
        setBracketLocked(bracketData.bracketLocked ?? false);
        setLoading(false);
      }
    );
  }, []);

  const bearsById = useMemo(() => new Map(bears.map((b) => [b.id, b])), [bears]);

  // Re-derive what each matchup's contestants look like given the CURRENT
  // local picks — this is what makes an earlier pick instantly populate the
  // next round's slot in the UI, with no round-trip to the server.
  const resolved = useMemo(() => resolveContestants(matchups, picks), [matchups, picks]);
  const resolvedById = useMemo(() => new Map(resolved.map((r) => [r.id, r])), [resolved]);

  const pickBear = useCallback(
    (matchupId: string, bearId: string) => {
      const nextPicks = { ...picks, [matchupId]: bearId };
      setPicks(pruneInvalidPicks(matchups, nextPicks));
      setSaved(false);
    },
    [picks, matchups]
  );

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const byRound = [1, 2, 3, 4].map((round) =>
    matchups.filter((m) => m.round === round).sort((a, b) => a.position - b.position)
  );

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-5 pt-10 pb-4">
        <h1 className="text-2xl font-black text-neutral-50">My Bracket</h1>
        {bracketLocked && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning">
            <Lock size={16} />
            The bracket is locked — picks can no longer be changed.
          </div>
        )}
      </header>

      <main className="flex-1 px-5 pb-24 space-y-8">
        {byRound.map((roundMatchups, idx) => (
          <section key={idx}>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500">
              {ROUND_LABELS[idx + 1]}
            </h2>
            <div className="space-y-3">
              {roundMatchups.map((m) => {
                const r = resolvedById.get(m.id);
                return (
                  <MatchupPicker
                    key={m.id}
                    bearA={r?.bearAId ? bearsById.get(r.bearAId) : undefined}
                    bearB={r?.bearBId ? bearsById.get(r.bearBId) : undefined}
                    picked={picks[m.id]}
                    disabled={bracketLocked}
                    onPick={(bearId) => pickBear(m.id, bearId)}
                  />
                );
              })}
            </div>
          </section>
        ))}

        {error && <p className="text-sm text-danger">{error}</p>}
      </main>

      {!bracketLocked && (
        <div className="fixed bottom-20 right-5 sm:bottom-6 sm:right-6 z-30">
          <Button onClick={handleSave} loading={saving} className="shadow-xl shadow-black/40">
            {saved ? "Saved!" : "Save my bracket"}
          </Button>
        </div>
      )}
    </div>
  );
}

function MatchupPicker({
  bearA,
  bearB,
  picked,
  disabled,
  onPick,
}: {
  bearA?: Bear;
  bearB?: Bear;
  picked?: string;
  disabled: boolean;
  onPick: (bearId: string) => void;
}) {
  if (!bearA || !bearB) {
    return (
      <Card>
        <CardBody className="text-sm text-neutral-500 text-center py-6">Waiting on an earlier round's pick…</CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="flex-row gap-2 p-2">
        {[bearA, bearB].map((bear) => (
          <button
            key={bear.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(bear.id)}
            className={cn(
              "flex-1 rounded-xl border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed",
              picked === bear.id ? "border-success bg-success/10" : "border-white/10 bg-surface-elevated"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-100">{bear.name}</span>
              <Badge variant="accent">#{bear.number}</Badge>
            </div>
          </button>
        ))}
      </CardBody>
    </Card>
  );
}
