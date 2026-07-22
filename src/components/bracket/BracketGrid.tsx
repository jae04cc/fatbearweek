"use client";
import { useEffect, useMemo, useRef } from "react";
import type { Bear, Matchup } from "@/lib/db/schema";
import { resolveContestants, type ResolvedMatchup } from "@/lib/bracket/topology";
import { BracketMatchBox, type ResultStatus, type MatchResult } from "@/components/bracket/BracketMatchBox";

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

// A box shows two contestants that arrived via independent storylines (one
// per feeder matchup, when it has one) — only ONE of them is this user's
// actual pick for the box itself. `pickStatus` describes that pick's own
// fate (correct/incorrect/busted/pending) and is what cascades into a CHILD
// box's aBusted/bBusted, since the child's contestant on that side IS this
// box's picked winner. `aBusted`/`bBusted` describe the OTHER thing: whether
// each of THIS box's two shown contestants already died on its own
// storyline before this box's own pick — e.g. a Final Four box can show one
// still-alive contestant (correctly predicted) alongside one already-dead
// one (a different, incorrect earlier-round pick), and only the dead one
// should render greyed out, never the whole box.
function computeMatchResults(
  matchups: Matchup[],
  picks: Record<string, string>,
  resolvedById: Map<string, ResolvedMatchup>
): Map<string, MatchResult> {
  const ordered = [...matchups].sort((a, b) => a.round - b.round || a.position - b.position);
  const resultById = new Map<string, MatchResult>();

  const isDead = (matchupId: string | null | undefined) => {
    if (!matchupId) return false;
    const status = resultById.get(matchupId)?.pickStatus;
    return status === "busted" || status === "incorrect";
  };

  for (const m of ordered) {
    const pick = picks[m.id];
    const r = resolvedById.get(m.id);
    const aBusted = isDead(m.feederMatchupAId);
    const bBusted = isDead(m.feederMatchupBId);

    if (!pick) {
      resultById.set(m.id, { pickStatus: "pending", aBusted, bBusted });
      continue;
    }

    const pickedSideAlreadyDead = (pick === r?.bearAId && aBusted) || (pick === r?.bearBId && bBusted);
    if (pickedSideAlreadyDead) {
      resultById.set(m.id, { pickStatus: "busted", aBusted, bBusted });
      continue;
    }

    const bothRealKnown = Boolean(m.bearAId && m.bearBId);
    if (bothRealKnown && pick !== m.bearAId && pick !== m.bearBId) {
      resultById.set(m.id, { pickStatus: "busted", aBusted, bBusted });
      continue;
    }

    if (m.winnerBearId) {
      resultById.set(m.id, { pickStatus: pick === m.winnerBearId ? "correct" : "incorrect", aBusted, bBusted });
      continue;
    }

    resultById.set(m.id, { pickStatus: "pending", aBusted, bBusted });
  }

  return resultById;
}

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

export function BracketGrid({
  matchups,
  bearsById,
  picks,
  disabled,
  onPick,
}: {
  matchups: Matchup[];
  bearsById: Map<string, Bear>;
  picks: Record<string, string>;
  disabled: boolean;
  onPick: (matchupId: string, bearId: string) => void;
}) {
  const scrollRef = useRef<HTMLElement>(null);

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
  }, []);

  const resolved = useMemo(() => resolveContestants(matchups, picks), [matchups, picks]);
  const resolvedById = useMemo(() => new Map(resolved.map((r) => [r.id, r])), [resolved]);
  const resultById = useMemo(
    () => computeMatchResults(matchups, picks, resolvedById),
    [matchups, picks, resolvedById]
  );
  const byRound = (round: number) => matchups.filter((m) => m.round === round).sort((a, b) => a.position - b.position);

  return (
    <main ref={scrollRef} className="no-scrollbar flex-1 overflow-x-auto pb-4">
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
                  disabled={disabled}
                  onPick={(bearId) => onPick(m.id, bearId)}
                  matchResult={resultById.get(m.id)}
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
                    disabled={disabled}
                    onPick={(bearId) => onPick(m.id, bearId)}
                    matchResult={resultById.get(m.id)}
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
                  disabled={disabled}
                  onPick={(bearId) => onPick(m.id, bearId)}
                  matchResult={resultById.get(m.id)}
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
                  disabled={disabled}
                  onPick={(bearId) => onPick(m.id, bearId)}
                  matchResult={resultById.get(m.id)}
                />
              </div>
            );
          })}
        </div>
        <div className="w-5 shrink-0" aria-hidden="true" />
      </div>
    </main>
  );
}
