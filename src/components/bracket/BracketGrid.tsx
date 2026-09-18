"use client";
import { useEffect, useMemo, useRef } from "react";
import type { Bear, Matchup } from "@/lib/db/schema";
import { resolveContestants, type ResolvedMatchup } from "@/lib/bracket/topology";
import { bracketHasByes, bracketTemplateRows, boxGridRow } from "@/lib/bracket/layout";
import { BracketMatchBox, type ResultStatus, type MatchResult } from "@/components/bracket/BracketMatchBox";
import { CompactRounds } from "@/components/bracket/CompactRounds";
import { MergeConnector } from "@/components/bracket/BracketConnectors";
import { RoundHeading } from "@/components/bracket/RoundHeading";

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

// Columns: 1=Round1, 2=gutter (Round1→Round2 connector),
// 3=Round2, 4=gutter (→Final Four), 5=Final Four, 6=gutter (→Championship), 7=Championship
const GRID_TEMPLATE_COLUMNS = "280px 28px 280px 28px 280px 28px 280px";

export function BracketGrid({
  matchups,
  bearsById,
  picks,
  disabled,
  onPick,
  onSelectBear,
}: {
  matchups: Matchup[];
  bearsById: Map<string, Bear>;
  picks: Record<string, string>;
  disabled: boolean;
  onPick: (matchupId: string, bearId: string) => void;
  onSelectBear: (bear: Bear) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // 4 Round 1 matchups = a 12-bear bracket with byes; 8 = a flat 16-bear one.
  const round1Count = byRound(1).length;
  const hasByes = bracketHasByes(round1Count);
  const gridRow = (round: number, position: number) => boxGridRow(round, position, hasByes ? "packed" : "spread");
  // Round 2's bye boxes are shifted up so the Round 1 winner lands on the
  // connector line; a flat bracket's Round 2 boxes are centered like any other.
  const r2Shift = hasByes ? 25 : 0;

  // One box, placed by whichever layout is rendering it — the desktop grid
  // below, or the compact per-round stacks on a phone.
  const renderBox = (m: Matchup) => {
    const r = resolvedById.get(m.id);
    return (
      <BracketMatchBox
        bearA={r?.bearAId ? bearsById.get(r.bearAId) : undefined}
        bearB={r?.bearBId ? bearsById.get(r.bearBId) : undefined}
        picked={picks[m.id]}
        disabled={disabled}
        onPick={(bearId) => onPick(m.id, bearId)}
        onSelectBear={onSelectBear}
        matchResult={resultById.get(m.id)}
      />
    );
  };

  // A 12-bear bracket is packed at every width, so it renders one grid; a
  // 16-bear one swaps in the packed phone layout below md.
  const phoneLayout = !hasByes;

  return (
    <main className="flex-1">
      {phoneLayout && (
        <div className="md:hidden">
          <CompactRounds matchups={matchups} renderBox={renderBox} />
        </div>
      )}

      {/* An explicit trailing spacer <div>, not padding on the scroll
          container or the grid — padding at the far edge of horizontally
          scrolled content is unreliable across browsers (it can get
          clipped once content overflows), but a real element always
          counts toward the scrollable width. */}
      <div
        ref={scrollRef}
        className={`no-scrollbar overflow-x-auto pb-4 ${phoneLayout ? "hidden md:flex" : "flex"}`}
      >
        <div
          className="grid gap-x-3 gap-y-8 pl-5"
          style={{ gridTemplateColumns: GRID_TEMPLATE_COLUMNS, gridTemplateRows: bracketTemplateRows(round1Count) }}
        >
          {/* Column headers */}
          <RoundHeading round={1} style={{ gridColumn: 1, gridRow: 1 }} />
          <RoundHeading round={2} style={{ gridColumn: 3, gridRow: 1 }} />
          <RoundHeading round={3} style={{ gridColumn: 5, gridRow: 1 }} />
          <RoundHeading round={4} style={{ gridColumn: 7, gridRow: 1 }} />

          {/* Round 1 */}
          {byRound(1).map((m) => (
            <div key={m.id} style={{ gridColumn: 1, gridRow: gridRow(1, m.position) }} className="flex items-center">
              {renderBox(m)}
            </div>
          ))}

          {/* Connector: Round 1 → Round 2. In a bye bracket it's a single
              straight line into Round 2's shifted box (the bye sits above it);
              in a flat 16-bear bracket it's an elbow merging the two Round 1
              winners, like every other round. */}
          {byRound(2).map((m) =>
            hasByes ? (
              <div key={`line-${m.id}`} style={{ gridColumn: 2, gridRow: gridRow(2, m.position) }} className="relative">
                <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-white/20" />
              </div>
            ) : (
              <div key={`line-${m.id}`} style={{ gridColumn: 2, gridRow: gridRow(2, m.position) }}>
                <MergeConnector />
              </div>
            )
          )}

          {/* Round 2 — in a bye bracket, shifted up so its bottom row (the
              Round 1 feed) lines up with the connector; in a flat bracket it's
              centered in its two-row span like any other round. */}
          {byRound(2).map((m) => (
            <div key={m.id} style={{ gridColumn: 3, gridRow: gridRow(2, m.position) }} className="flex items-center">
              <div className="w-full" style={{ transform: r2Shift ? `translateY(-${r2Shift}px)` : undefined }}>
                {renderBox(m)}
              </div>
            </div>
          ))}

          {/* Connector: Round 2 → Final Four — an actual elbow flowing from
              each of the two feeder matchups into the next one, not just a
              floating vertical bar. */}
          {[1, 2].map((position) => (
            <div key={position} style={{ gridColumn: 4, gridRow: gridRow(3, position) }}>
              <MergeConnector feederOffsetPx={r2Shift} />
            </div>
          ))}

          {/* Final Four */}
          {byRound(3).map((m) => (
            <div key={m.id} style={{ gridColumn: 5, gridRow: gridRow(3, m.position) }} className="flex items-center">
              {renderBox(m)}
            </div>
          ))}

          {/* Connector: Final Four → Championship */}
          <div style={{ gridColumn: 6, gridRow: gridRow(4, 1) }}>
            <MergeConnector />
          </div>

          {/* Championship */}
          {byRound(4).map((m) => (
            <div key={m.id} style={{ gridColumn: 7, gridRow: gridRow(4, 1) }} className="flex items-center">
              {renderBox(m)}
            </div>
          ))}
        </div>
        <div className="w-5 shrink-0" aria-hidden="true" />
      </div>
    </main>
  );
}
