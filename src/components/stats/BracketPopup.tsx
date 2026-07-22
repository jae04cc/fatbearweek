"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const areaRef = useRef<HTMLDivElement>(null);
  const gridWrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [wrapperWidth, setWrapperWidth] = useState<number | null>(null);

  // The bracket is a fixed, fairly tall grid — someone's full bracket often
  // doesn't fit under the header within 90vh. Rather than let it scroll
  // vertically (confusing alongside the grid's own horizontal scroll), scale
  // the whole thing down uniformly so it always fits top-to-bottom, leaving
  // only the intentional left/right scroll for the columns themselves.
  //
  // A plain `transform: scale()` isn't enough on its own: the wrapper's own
  // (pre-scale) width still defaults to the viewing area's width, so once
  // shrunk it only fills the top-left corner, leaving the rest of the area
  // blank instead of using the extra room. Explicitly widening the wrapper
  // to `available / scale` means it renders back at exactly the viewing
  // area's full width after the shrink — and BracketGrid's OWN internal
  // horizontal scroll (its `<main>` always fills 100% of this wrapper) then
  // has that same full width to work with, so anything still too wide to
  // fit is reached by scrolling, never by shrinking further.
  useLayoutEffect(() => {
    if (loading || error) return;
    const area = areaRef.current;
    const wrapper = gridWrapperRef.current;
    if (!area || !wrapper) return;

    const recomputeScale = () => {
      wrapper.style.transform = "none";
      wrapper.style.width = "auto";
      const availableHeight = area.clientHeight;
      const availableWidth = area.clientWidth;
      const naturalHeight = wrapper.scrollHeight;
      const nextScale = availableHeight > 0 && naturalHeight > 0 ? Math.min(1, availableHeight / naturalHeight) : 1;
      setScale(nextScale);
      setWrapperWidth(nextScale > 0 ? availableWidth / nextScale : availableWidth);
    };

    recomputeScale();
    window.addEventListener("resize", recomputeScale);
    return () => window.removeEventListener("resize", recomputeScale);
  }, [loading, error, matchups, picks]);

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
          <div ref={areaRef} className="min-h-0 flex-1 overflow-y-hidden">
            <div
              ref={gridWrapperRef}
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: wrapperWidth !== null ? `${wrapperWidth}px` : undefined,
              }}
            >
              <BracketGrid
                matchups={matchups}
                bearsById={bearsById}
                picks={picks}
                disabled
                onPick={() => {}}
                onSelectBear={setViewingBear}
              />
            </div>
          </div>
        )}
      </div>

      {viewingBear && <BearProfilePopup bear={viewingBear} onClose={() => setViewingBear(null)} />}
    </div>
  );
}
