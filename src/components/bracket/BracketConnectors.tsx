"use client";
import { Fragment } from "react";

// The lines between two rounds' columns. Both shapes are drawn as a
// percentage of the gutter cell they're given, so they follow whatever
// height the grid's rows actually end up at.

// An elbow: two horizontal stubs (one from each feeder matchup, at their
// vertical centers within this merged span) joined by a vertical bar, then
// one horizontal line continuing into the next matchup — the classic bracket
// "these two feed into that one" shape, instead of a floating vertical bar
// with no visible link to the boxes on either side.
//
// `feederOffsetPx` accounts for feeder boxes that are themselves shifted off
// their row's natural center (a 12-bear bracket's Round 2 boxes are shifted
// up 25px to line up with the Round 1 connector) so the incoming stubs still
// land on the feeders' *actual* rendered centers. The outgoing stub always
// exits at the true 50% mark, matching the next round's box, which is never
// shifted.
export function MergeConnector({ feederOffsetPx = 0 }: { feederOffsetPx?: number }) {
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

// Round 1 → Round 2 for the packed phone layout, where both columns start at
// the top: box j of Round 2 sits ABOVE the two boxes feeding it rather than
// centered between them, so each elbow's outgoing stub leaves from the top of
// its riser and the whole set fans upward.
//
// Every elbow needs its own vertical lane. Sharing one (as MergeConnector's
// elbows can, each owning a distinct slice of the column) would merge all the
// risers into a single floor-to-ceiling line, since elbow 2 starts above where
// elbow 1 ends. Lanes make the routing crossing-free for free: a later elbow's
// stubs always sit below every earlier elbow's riser.
//
// Spans all of Round 1's base rows, so a row's center is its index over the
// row count — which is why this cell must not sit in a grid with row gaps.
export function FanConnector({ pairs }: { pairs: number }) {
  const rows = pairs * 2;
  return (
    <div className="relative h-full w-full">
      {Array.from({ length: pairs }, (_, i) => i + 1).map((target) => {
        const upperFeeder = ((2 * target - 1.5) / rows) * 100;
        const lowerFeeder = ((2 * target - 0.5) / rows) * 100;
        const center = ((target - 0.5) / rows) * 100;
        const lane = (target / (pairs + 1)) * 100;
        return (
          <Fragment key={target}>
            <div
              className="absolute left-0 h-0.5 -translate-y-1/2 bg-white/20"
              style={{ top: `${upperFeeder}%`, width: `${lane}%` }}
            />
            <div
              className="absolute left-0 h-0.5 -translate-y-1/2 bg-white/20"
              style={{ top: `${lowerFeeder}%`, width: `${lane}%` }}
            />
            <div
              className="absolute w-0.5 -translate-x-1/2 bg-white/20"
              style={{ left: `${lane}%`, top: `${center}%`, height: `${lowerFeeder - center}%` }}
            />
            <div
              className="absolute right-0 h-0.5 -translate-y-1/2 bg-white/20"
              style={{ top: `${center}%`, left: `${lane}%` }}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
