"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Bear, Matchup } from "@/lib/db/schema";
import { resolveContestants, pruneInvalidPicks } from "@/lib/bracket/topology";
import { BracketMatchBox } from "@/components/bracket/BracketMatchBox";
import { Button } from "@/components/ui/Button";
import { Lock } from "lucide-react";

const ROUND_LABELS: Record<number, string> = {
  1: "Round 1",
  2: "Round 2",
  3: "Final Four",
  4: "Championship",
};

// Grid row 1 is the header row; rows 2-5 are the 4 base units that Round 1
// and Round 2 sit in 1:1. Round 3 merges pairs of Round 2 rows, and
// Round 4 merges both Round 3 rows — the classic bracket "elbow" shape,
// expressed as CSS grid-row spans instead of hand-computed pixel math.
function baseRow(position: number) {
  return `${position + 1} / ${position + 2}`;
}
function mergedRow(position: number) {
  return `${2 * position} / ${2 * position + 2}`;
}
const FINAL_ROW = "2 / 6";

// An elbow connector: two horizontal stubs (one from each feeder matchup,
// at their vertical centers within this merged span) joined by a vertical
// bar, then one horizontal line continuing into the next matchup — the
// classic bracket "these two feed into that one" shape, instead of a
// floating vertical bar with no visible link to the boxes on either side.
//
// `feederOffsetPx` accounts for feeder boxes that are themselves shifted off
// their row's natural center (Round 2's boxes are shifted up 25px to line up
// with the Round 1 connector — see below) so the incoming stubs still land on
// the feeders' *actual* rendered centers. The outgoing stub always exits at
// the true 50% mark, matching the next round's box, which is never shifted.
function MergeConnector({ feederOffsetPx = 0 }: { feederOffsetPx?: number }) {
  const topStub = `calc(25% - ${feederOffsetPx}px)`;
  const bottomStub = `calc(75% - ${feederOffsetPx}px)`;
  return (
    <div className="relative h-full w-full">
      <div className="absolute left-0 h-0.5 w-1/2 -translate-y-1/2 bg-white/20" style={{ top: topStub }} />
      <div className="absolute left-0 h-0.5 w-1/2 -translate-y-1/2 bg-white/20" style={{ top: bottomStub }} />
      <div className="absolute left-1/2 w-0.5 -translate-x-1/2 bg-white/20" style={{ top: topStub, height: "50%" }} />
      <div className="absolute right-0 h-0.5 w-1/2 -translate-y-1/2 bg-white/20" style={{ top: "50%" }} />
    </div>
  );
}

// Columns: 1=Round1, 2=gutter (Round1→Round2 connector),
// 3=Round2, 4=gutter (→Final Four), 5=Final Four, 6=gutter (→Championship), 7=Championship
const GRID_TEMPLATE_COLUMNS = "220px 28px 220px 28px 220px 28px 220px";
const GRID_TEMPLATE_ROWS = "auto repeat(4, minmax(128px, auto))";

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
  const scrollRef = useRef<HTMLElement>(null);

  // The bootstrap operator account isn't a player — send it away even if it
  // navigates here directly, since the nav link is already hidden for it.
  useEffect(() => {
    if (session?.user.isBootstrap) router.replace("/");
  }, [session, router]);

  // Lets a plain vertical mouse wheel scroll the bracket sideways (desktop
  // mice have no horizontal wheel) — without this, mouse users would have no
  // way to reach the rest of the bracket short of dragging a scrollbar we
  // intentionally hide (see the .no-scrollbar class) to keep it clean on mobile.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
    // Re-run once loading flips to false — that's when <main> actually
    // mounts and scrollRef.current stops being null (it's still the loading
    // spinner, not <main>, on the very first render).
  }, [loading]);

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

  const byRound = (round: number) => matchups.filter((m) => m.round === round).sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col">
      <header className="px-5 pt-10 pb-4">
        <h1 className="text-2xl font-black text-neutral-50">My Bracket</h1>
        <p className="mt-0.5 text-xs text-neutral-500 sm:hidden">Scroll sideways to see the full bracket →</p>
        {bracketLocked && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning">
            <Lock size={16} />
            The bracket is locked — picks can no longer be changed.
          </div>
        )}
      </header>

      <main ref={scrollRef} className="no-scrollbar flex-1 overflow-x-auto pb-24">
        {/* An explicit trailing spacer <div>, not padding on the scroll
            container or the grid — padding at the far edge of horizontally
            scrolled content is unreliable across browsers (it can get
            clipped once content overflows), but a real element always
            counts toward the scrollable width. */}
        <div className="flex">
        <div
          className="grid gap-x-3 gap-y-8 pl-5"
          style={{ gridTemplateColumns: GRID_TEMPLATE_COLUMNS, gridTemplateRows: GRID_TEMPLATE_ROWS }}
        >
          {/* Column headers */}
          <div style={{ gridColumn: 1, gridRow: 1 }} className="pb-2 text-center text-xs font-bold uppercase tracking-widest text-neutral-500">
            {ROUND_LABELS[1]}
          </div>
          <div style={{ gridColumn: 3, gridRow: 1 }} className="pb-2 text-center text-xs font-bold uppercase tracking-widest text-neutral-500">
            {ROUND_LABELS[2]}
          </div>
          <div style={{ gridColumn: 5, gridRow: 1 }} className="pb-2 text-center text-xs font-bold uppercase tracking-widest text-neutral-500">
            {ROUND_LABELS[3]}
          </div>
          <div style={{ gridColumn: 7, gridRow: 1 }} className="pb-2 text-center text-xs font-bold uppercase tracking-widest text-neutral-500">
            {ROUND_LABELS[4]}
          </div>

          {/* Round 1 */}
          {byRound(1).map((m) => {
            const r = resolvedById.get(m.id);
            return (
              <div key={m.id} style={{ gridColumn: 1, gridRow: baseRow(m.position) }} className="flex items-center">
                <BracketMatchBox
                  bearA={r?.bearAId ? bearsById.get(r.bearAId) : undefined}
                  bearB={r?.bearBId ? bearsById.get(r.bearBId) : undefined}
                  picked={picks[m.id]}
                  disabled={bracketLocked}
                  onPick={(bearId) => pickBear(m.id, bearId)}
                />
              </div>
            );
          })}

          {/* Connector: a single straight line from Round 1's box-center to
              Round 2's box-center. Round 2's box itself is shifted up (see
              below) so that line lands on its BOTTOM row — the "blank spot"
              Round 1's winner fills. That shift leaves the TOP row (the bye
              bear, always bearA for Round 2) sitting above the line, clearly
              apart from it — no label needed, the geometry says it. */}
          {byRound(2).map((m) => (
            <div key={`line-${m.id}`} style={{ gridColumn: 2, gridRow: baseRow(m.position) }} className="relative">
              <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-white/20" />
            </div>
          ))}

          {/* Round 2 — shifted up so its bottom row (the Round 1 feed) lines
              up with the connector; the top row (bye) sits above it, offset. */}
          {byRound(2).map((m) => {
            const r = resolvedById.get(m.id);
            return (
              <div key={m.id} style={{ gridColumn: 3, gridRow: baseRow(m.position) }} className="flex items-center">
                <div className="w-full -translate-y-[25px]">
                  <BracketMatchBox
                    bearA={r?.bearAId ? bearsById.get(r.bearAId) : undefined}
                    bearB={r?.bearBId ? bearsById.get(r.bearBId) : undefined}
                    picked={picks[m.id]}
                    disabled={bracketLocked}
                    onPick={(bearId) => pickBear(m.id, bearId)}
                  />
                </div>
              </div>
            );
          })}

          {/* Connector: Round 2 → Final Four — an actual elbow flowing from
              each of the two feeder matchups into the next one, not just a
              floating vertical bar. */}
          {[1, 2].map((position) => (
            <div key={position} style={{ gridColumn: 4, gridRow: mergedRow(position) }}>
              <MergeConnector feederOffsetPx={25} />
            </div>
          ))}

          {/* Final Four */}
          {byRound(3).map((m) => {
            const r = resolvedById.get(m.id);
            return (
              <div key={m.id} style={{ gridColumn: 5, gridRow: mergedRow(m.position) }} className="flex items-center">
                <BracketMatchBox
                  bearA={r?.bearAId ? bearsById.get(r.bearAId) : undefined}
                  bearB={r?.bearBId ? bearsById.get(r.bearBId) : undefined}
                  picked={picks[m.id]}
                  disabled={bracketLocked}
                  onPick={(bearId) => pickBear(m.id, bearId)}
                />
              </div>
            );
          })}

          {/* Connector: Final Four → Championship */}
          <div style={{ gridColumn: 6, gridRow: FINAL_ROW }}>
            <MergeConnector />
          </div>

          {/* Championship */}
          {byRound(4).map((m) => {
            const r = resolvedById.get(m.id);
            return (
              <div key={m.id} style={{ gridColumn: 7, gridRow: FINAL_ROW }} className="flex items-center">
                <BracketMatchBox
                  bearA={r?.bearAId ? bearsById.get(r.bearAId) : undefined}
                  bearB={r?.bearBId ? bearsById.get(r.bearBId) : undefined}
                  picked={picks[m.id]}
                  disabled={bracketLocked}
                  onPick={(bearId) => pickBear(m.id, bearId)}
                />
              </div>
            );
          })}
        </div>
        <div className="w-5 shrink-0" aria-hidden="true" />
        </div>

        {error && <p className="mt-4 px-5 text-sm text-danger">{error}</p>}
      </main>

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
