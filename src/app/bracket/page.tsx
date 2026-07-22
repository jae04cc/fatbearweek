"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Bear, Matchup } from "@/lib/db/schema";
import { pruneInvalidPicks } from "@/lib/bracket/topology";
import { BracketGrid } from "@/components/bracket/BracketGrid";
import { Button } from "@/components/ui/Button";
import { Lock } from "lucide-react";

export default function BracketPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [bears, setBears] = useState<Bear[]>([]);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [bracketLocked, setBracketLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLockNotice, setShowLockNotice] = useState(false);

  // The bootstrap operator account isn't a player — send it away even if it
  // navigates here directly, since the nav link is already hidden for it.
  useEffect(() => {
    if (session?.user.isBootstrap) router.replace("/");
  }, [session, router]);

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

  const bearsById = new Map(bears.map((b) => [b.id, b]));

  const pickBear = useCallback(
    (matchupId: string, bearId: string) => {
      setPicks((prev) => pruneInvalidPicks(matchups, { ...prev, [matchupId]: bearId }));
      setSaved(false);
    },
    [matchups]
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

  const handleClear = () => {
    if (!confirm("Clear all your picks? This won't take effect until you hit Save.")) return;
    setPicks({});
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <header className="relative px-5 pt-10 pb-4">
        <h1 className="text-2xl font-black text-neutral-50">My Bracket</h1>
        <p className="mt-0.5 text-xs text-neutral-500 sm:hidden">Scroll sideways to see the full bracket →</p>
        {bracketLocked && (
          <button
            type="button"
            onClick={() => setShowLockNotice((v) => !v)}
            className="absolute right-5 top-10 flex h-8 w-8 items-center justify-center rounded-full bg-warning/15 text-warning"
            aria-label="Bracket is locked"
          >
            <Lock size={16} />
          </button>
        )}
        {bracketLocked && showLockNotice && (
          <div className="absolute right-5 top-20 z-20 w-56 rounded-xl border border-warning/30 bg-surface-elevated px-3 py-2.5 text-xs text-warning shadow-xl">
            The bracket is locked — picks can no longer be changed.
          </div>
        )}
      </header>

      <div className="pb-24">
        <BracketGrid matchups={matchups} bearsById={bearsById} picks={picks} disabled={bracketLocked} onPick={pickBear} />
        {error && <p className="px-5 pt-4 text-sm text-danger">{error}</p>}
      </div>

      {!bracketLocked && (
        <div className="fixed bottom-20 right-5 sm:bottom-6 sm:right-6 z-30 flex gap-2">
          <Button variant="secondary" onClick={handleClear} className="shadow-xl shadow-black/40">
            Clear
          </Button>
          <Button onClick={handleSave} loading={saving} className="shadow-xl shadow-black/40">
            {saved ? "Saved!" : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}
