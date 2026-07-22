"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { Bear, Matchup } from "@/lib/db/schema";
import { MatchupCard } from "@/components/matchups/MatchupCard";
import { BearProfilePopup } from "@/components/bears/BearProfilePopup";
import { Button } from "@/components/ui/Button";

const ROUND_LABELS: Record<number, string> = {
  1: "Round 1",
  2: "Round 2",
  3: "Final Four",
  4: "Championship",
};

export default function MatchupsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user.isAdmin ?? false;

  const [bears, setBears] = useState<Bear[]>([]);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [pickStats, setPickStats] = useState<Record<string, Record<string, number>>>({});
  const [currentRound, setCurrentRound] = useState(1);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingBear, setViewingBear] = useState<Bear | null>(null);

  const load = useCallback(() => {
    Promise.all([fetch("/api/bears").then((r) => r.json()), fetch("/api/matchups").then((r) => r.json())]).then(
      ([bearsData, matchupData]) => {
        setBears(Array.isArray(bearsData) ? bearsData : []);
        setMatchups(matchupData.matchups ?? []);
        setPickStats(matchupData.pickStats ?? {});
        setCurrentRound(matchupData.currentRound ?? 1);
        setLoading(false);
      }
    );
  }, []);

  useEffect(load, [load]);

  const bearsById = new Map(bears.map((b) => [b.id, b]));

  const handleMarkWinner = async (matchupId: string, bearId: string) => {
    setError(null);
    setMarkingId(matchupId);
    try {
      const res = await fetch(`/api/admin/matchups/${matchupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerBearId: bearId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to mark winner");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mark winner");
    } finally {
      setMarkingId(null);
    }
  };

  const handleUnmarkWinner = async (matchupId: string) => {
    setError(null);
    setMarkingId(matchupId);
    try {
      const res = await fetch(`/api/admin/matchups/${matchupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerBearId: null }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to undo winner");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to undo winner");
    } finally {
      setMarkingId(null);
    }
  };

  const handleAdvance = async () => {
    setError(null);
    setAdvancing(true);
    try {
      const res = await fetch("/api/admin/matchups/advance-round", { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to advance round");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to advance round");
    } finally {
      setAdvancing(false);
    }
  };

  const handleRegress = async () => {
    if (!confirm(`Go back to ${ROUND_LABELS[currentRound - 1]}? This only changes which round is shown here — recorded winners are untouched.`)) return;
    setError(null);
    setAdvancing(true);
    try {
      const res = await fetch("/api/admin/matchups/regress-round", { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to go back a round");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to go back a round");
    } finally {
      setAdvancing(false);
    }
  };

  const allDecided = matchups.length > 0 && matchups.every((m) => m.winnerBearId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-black text-neutral-50">Round Matchups</h1>
        <p className="text-sm text-neutral-400 mt-0.5">{ROUND_LABELS[currentRound] ?? `Round ${currentRound}`}</p>
      </header>

      <main className="flex-1 px-5 pb-10 space-y-3">
        {matchups.length === 0 ? (
          <p className="text-center text-neutral-500 py-20">
            The bracket hasn't been seeded yet{isAdmin ? " — head to Admin → Setup to set it up." : "."}
          </p>
        ) : (
          matchups.map((m) => (
            <MatchupCard
              key={m.id}
              matchup={m}
              bearA={m.bearAId ? bearsById.get(m.bearAId) : undefined}
              bearB={m.bearBId ? bearsById.get(m.bearBId) : undefined}
              pickCounts={pickStats[m.id] ?? {}}
              isAdmin={isAdmin}
              marking={markingId === m.id}
              onMarkWinner={(bearId) => handleMarkWinner(m.id, bearId)}
              onUnmarkWinner={() => handleUnmarkWinner(m.id)}
              onSelectBear={setViewingBear}
            />
          ))
        )}

        {error && <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

        {isAdmin && matchups.length > 0 && currentRound < 4 && (
          <Button variant="secondary" className="w-full" loading={advancing} disabled={!allDecided} onClick={handleAdvance}>
            {allDecided ? `Advance to ${ROUND_LABELS[currentRound + 1]}` : "Mark all winners to advance"}
          </Button>
        )}
        {isAdmin && matchups.length > 0 && currentRound > 1 && (
          <Button variant="ghost" className="w-full" loading={advancing} onClick={handleRegress}>
            Undo advance — back to {ROUND_LABELS[currentRound - 1]}
          </Button>
        )}
      </main>

      {viewingBear && <BearProfilePopup bear={viewingBear} onClose={() => setViewingBear(null)} />}
    </div>
  );
}
