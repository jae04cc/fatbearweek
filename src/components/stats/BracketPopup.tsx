"use client";
import { useEffect, useRef, useState } from "react";
import type { Bear, Matchup } from "@/lib/db/schema";
import { BracketGrid } from "@/components/bracket/BracketGrid";
import { BearProfilePopup } from "@/components/bears/BearProfilePopup";
import { X } from "lucide-react";

export function BracketPopup({ userId, bears, onClose }: { userId: string; bears: Bear[]; onClose: () => void }) {
  const [displayName, setDisplayName] = useState("");
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingBear, setViewingBear] = useState<Bear | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    fetch(`/api/bracket/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setDisplayName(data.displayName);
          setMatchups(data.matchups ?? []);
          setPicks(data.picks ?? {});
        }
        setLoading(false);
      });
  }, [userId]);

  const bearsById = new Map(bears.map((b) => [b.id, b]));

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-bold text-neutral-50">{loading ? "Loading…" : `${displayName}'s Bracket`}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-neutral-400" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
          </div>
        ) : error ? (
          <p className="px-5 py-10 text-center text-sm text-danger">{error}</p>
        ) : (
          <BracketGrid
            matchups={matchups}
            bearsById={bearsById}
            picks={picks}
            disabled
            onPick={() => {}}
            onSelectBear={setViewingBear}
          />
        )}
      </div>

      {viewingBear && <BearProfilePopup bear={viewingBear} onClose={() => setViewingBear(null)} />}
    </div>
  );
}
