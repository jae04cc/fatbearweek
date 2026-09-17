"use client";
import type { ReactNode } from "react";
import type { Matchup } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { ROUND_LABELS, bracketTemplateRows, boxGridRow, COMPACT_ROW_MIN } from "@/lib/bracket/layout";
import { MergeConnector, FanConnector } from "@/components/bracket/BracketConnectors";

// The phone layout for a 16-bear bracket, used by both renderers (the
// interactive BracketGrid and the read-only ResultsBracket) in place of the
// "spread" desktop grid. A 12-bear bracket doesn't need it — its rows are
// already packed on every screen.
//
// Spread out to its true shape, a 16-bear bracket's Championship box is
// centered against all eight Round 1 rows: fine on a wide screen, but on a
// ~390px one only a single round is visible at a time, so swiping over to the
// Championship lands on empty space with its one box floating hundreds of
// pixels below the fold, its round header long since scrolled away.
//
// So Round 1 and Round 2 each get one base row here — both columns start at
// the top, with Round 1 fanning upward into Round 2 — and the Final Four and
// Championship are centered against Round 2's four rows the ordinary way,
// which is short enough to read without hunting. See BracketRowMode.
//
// This grid deliberately has no row gaps: FanConnector's lines are placed as
// a fraction of the rows it spans, which only lines up if the rows are the
// only thing in that span. The spacing between boxes comes from the row
// floor (COMPACT_ROW_MIN) being taller than a box instead.
const GRID_TEMPLATE_COLUMNS = "280px 52px 280px 28px 280px 28px 280px";

export function CompactRounds({
  matchups,
  renderBox,
}: {
  matchups: Matchup[];
  renderBox: (matchup: Matchup) => ReactNode;
}) {
  const byRound = (round: number) =>
    matchups.filter((m) => m.round === round).sort((a, b) => a.position - b.position);

  const round1Count = byRound(1).length;
  const gridRow = (round: number, position: number) => boxGridRow(round, position, "packed");

  return (
    // Snap targets are Round 1's column and each connector cell — every
    // round is reachable, and a swipe settles with the incoming lines just on
    // screen rather than cutting them off. Round 1 needs one of its own:
    // under `snap-mandatory` a scroller can only come to rest on a snap
    // point, so without one the swipe back to Round 1 gets pushed forward to
    // Round 2. scroll-pl-5 keeps those targets clear of the grid's own left
    // padding instead of flush against the edge of the screen.
    <div className="no-scrollbar snap-x snap-mandatory scroll-pl-5 overflow-x-auto pb-4">
      <div className="flex">
        <div
          className="grid gap-x-2 pl-5"
          style={{
            gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
            gridTemplateRows: bracketTemplateRows(round1Count, COMPACT_ROW_MIN),
          }}
        >
          {[1, 2, 3, 4].map((round, i) => (
            <div
              key={round}
              style={{ gridColumn: i * 2 + 1, gridRow: 1 }}
              className={cn(
                "pb-2 text-center text-xs font-bold uppercase tracking-widest text-neutral-500",
                round === 1 && "snap-start"
              )}
            >
              {ROUND_LABELS[round]}
            </div>
          ))}

          {/* Round 1 */}
          {byRound(1).map((m) => (
            <div key={m.id} style={{ gridColumn: 1, gridRow: gridRow(1, m.position) }} className="flex items-center">
              {renderBox(m)}
            </div>
          ))}

          {/* Connectors: Round 1 → Round 2, one elbow per Round 2 box, all in
              a single cell spanning every base row so they can fan upward.
              It's also the snap point for Round 2 — a swipe settles with the
              incoming lines just on screen rather than cutting them off. */}
          <div
            style={{ gridColumn: 2, gridRow: `2 / ${round1Count + 2}` }}
            className="snap-start"
            aria-hidden="true"
          >
            <FanConnector pairs={round1Count / 2} />
          </div>

          {/* Round 2 — packed against the top, one box per base row. */}
          {byRound(2).map((m) => (
            <div key={m.id} style={{ gridColumn: 3, gridRow: gridRow(2, m.position) }} className="flex items-center">
              {renderBox(m)}
            </div>
          ))}

          {/* Connectors: Round 2 → Final Four, centered elbows like the
              desktop grid's, since from here on the rounds nest normally. */}
          {byRound(3).map((m) => (
            <div
              key={`line-${m.id}`}
              style={{ gridColumn: 4, gridRow: gridRow(3, m.position) }}
              className="snap-start"
              aria-hidden="true"
            >
              <MergeConnector />
            </div>
          ))}

          {/* Final Four */}
          {byRound(3).map((m) => (
            <div key={m.id} style={{ gridColumn: 5, gridRow: gridRow(3, m.position) }} className="flex items-center">
              {renderBox(m)}
            </div>
          ))}

          {/* Connector: Final Four → Championship */}
          <div style={{ gridColumn: 6, gridRow: gridRow(4, 1) }} className="snap-start" aria-hidden="true">
            <MergeConnector />
          </div>

          {/* Championship */}
          {byRound(4).map((m) => (
            <div key={m.id} style={{ gridColumn: 7, gridRow: gridRow(4, 1) }} className="flex items-center">
              {renderBox(m)}
            </div>
          ))}
        </div>
        {/* An explicit trailing spacer, not padding on the scroll container —
            padding at the far edge of horizontally scrolled content is
            unreliable across browsers, but a real element always counts
            toward the scrollable width. */}
        <div className="w-5 shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
}
