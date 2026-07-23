"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { Bear, Matchup } from "@/lib/db/schema";
import type { LeaderboardEntry } from "@/lib/bracket/scoring";
import { Leaderboard } from "@/components/stats/Leaderboard";
import { BracketPopup } from "@/components/stats/BracketPopup";
import { ResultsBracket } from "@/components/results/ResultsBracket";
import { BearProfilePopup } from "@/components/bears/BearProfilePopup";

export default function ResultsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user.isAdmin ?? false;
  const [bears, setBears] = useState<Bear[]>([]);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [pickStats, setPickStats] = useState<Record<string, Record<string, number>>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [bracketLocked, setBracketLocked] = useState(false);
  const [bracketRevealed, setBracketRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingBear, setViewingBear] = useState<Bear | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/bears").then((r) => r.json()),
      fetch("/api/stats/picks").then((r) => r.json()),
      fetch("/api/stats/leaderboard").then((r) => r.json()),
      fetch("/api/config").then((r) => r.json()),
    ]).then(([bearsData, picksData, leaderboardData, configData]) => {
      setBears(Array.isArray(bearsData) ? bearsData : []);
      setMatchups(picksData.matchups ?? []);
      setPickStats(picksData.pickStats ?? {});
      setLeaderboard(leaderboardData.leaderboard ?? []);
      setBracketLocked(configData.bracketLocked ?? false);
      setBracketRevealed(configData.bracketRevealed ?? false);
      setLoading(false);
    });
  }, []);

  const bearsById = new Map(bears.map((b) => [b.id, b]));
  // Straight-up hidden (not a placeholder) until the admin reveals it, or
  // there's simply nothing seeded yet — admins can still preview it.
  const showBracket = matchups.length > 0 && (isAdmin || bracketRevealed);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-5 pt-10 pb-6 text-center">
        <h1 className="text-2xl font-black text-neutral-50">Results</h1>
      </header>

      <main className="flex-1 pb-10 space-y-8">
        <section className="px-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500">Leaderboard</h2>
          {!bracketLocked && (
            <p className="mb-2 text-xs text-neutral-500">Brackets stay secret until the pool is locked.</p>
          )}
          <Leaderboard entries={leaderboard} locked={bracketLocked} onSelectUser={setViewingUserId} />
        </section>

        {showBracket && (
          <section>
            <h2 className="mb-3 px-5 text-xs font-bold uppercase tracking-widest text-neutral-500">Tournament results</h2>
            <ResultsBracket matchups={matchups} bearsById={bearsById} pickStats={pickStats} onSelectBear={setViewingBear} />
          </section>
        )}
      </main>

      {viewingUserId && <BracketPopup userId={viewingUserId} bears={bears} onClose={() => setViewingUserId(null)} />}
      {viewingBear && <BearProfilePopup bear={viewingBear} onClose={() => setViewingBear(null)} />}
    </div>
  );
}
