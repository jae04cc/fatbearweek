"use client";
import { useEffect, useState } from "react";
import type { Bear, Matchup } from "@/lib/db/schema";
import type { LeaderboardEntry } from "@/lib/bracket/scoring";
import { Leaderboard } from "@/components/stats/Leaderboard";
import { PickPercentageBar } from "@/components/stats/PickPercentageBar";
import { Card, CardBody } from "@/components/ui/Card";

const ROUND_LABELS: Record<number, string> = {
  1: "Round 1",
  2: "Round 2",
  3: "Final Four",
  4: "Championship",
};

export default function StatsPage() {
  const [bears, setBears] = useState<Bear[]>([]);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [pickStats, setPickStats] = useState<Record<string, Record<string, number>>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/bears").then((r) => r.json()),
      fetch("/api/stats/picks").then((r) => r.json()),
      fetch("/api/stats/leaderboard").then((r) => r.json()),
    ]).then(([bearsData, picksData, leaderboardData]) => {
      setBears(Array.isArray(bearsData) ? bearsData : []);
      setMatchups(picksData.matchups ?? []);
      setPickStats(picksData.pickStats ?? {});
      setLeaderboard(leaderboardData.leaderboard ?? []);
      setLoading(false);
    });
  }, []);

  const bearsById = new Map(bears.map((b) => [b.id, b]));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const byRound = [1, 2, 3, 4].map((round) =>
    matchups.filter((m) => m.round === round && m.bearAId && m.bearBId)
  );

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-black text-neutral-50">Stats</h1>
      </header>

      <main className="flex-1 px-5 pb-10 space-y-8">
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500">Leaderboard</h2>
          <Leaderboard entries={leaderboard} />
        </section>

        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500">Pick breakdown</h2>
          <div className="space-y-4">
            {byRound.map((roundMatchups, idx) =>
              roundMatchups.length === 0 ? null : (
                <div key={idx}>
                  <p className="mb-2 text-sm font-semibold text-neutral-300">{ROUND_LABELS[idx + 1]}</p>
                  <div className="space-y-3">
                    {roundMatchups.map((m) => {
                      const counts = pickStats[m.id] ?? {};
                      const total = Object.values(counts).reduce((a, b) => a + b, 0);
                      const bearA = m.bearAId ? bearsById.get(m.bearAId) : undefined;
                      const bearB = m.bearBId ? bearsById.get(m.bearBId) : undefined;
                      if (!bearA || !bearB) return null;
                      return (
                        <Card key={m.id}>
                          <CardBody className="gap-3">
                            <PickPercentageBar bear={bearA} pct={total > 0 ? Math.round(((counts[bearA.id] ?? 0) / total) * 100) : 0} />
                            <PickPercentageBar bear={bearB} pct={total > 0 ? Math.round(((counts[bearB.id] ?? 0) / total) * 100) : 0} />
                          </CardBody>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
