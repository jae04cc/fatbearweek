// Shared grid geometry for the bracket renderers (the interactive
// BracketGrid, the read-only ResultsBracket, and the packed phone layout in
// CompactRounds), so they all stay in lockstep across the 12-bear (bye) and
// 16-bear (flat) shapes.
//
// Every layout is the same CSS grid: a header row (row 1) plus N "base" rows,
// one per Round 1 matchup — 4 for a 12-bear bracket, 8 for a 16-bear one.
// Boxes are placed by `grid-row` span, never by pixel math, so a box that
// ends up taller than expected grows its row instead of overlapping its
// neighbour.

export const ROUND_LABELS: Record<number, string> = {
  1: "Round 1",
  2: "Round 2",
  3: "Final Four",
  4: "Championship",
};

// A 12-bear bracket has 4 Round 1 matchups; a 16-bear bracket has 8.
export function bracketHasByes(round1Count: number): boolean {
  return round1Count === 4;
}

// How much vertical room each round gets.
//
// "spread" is the true bracket shape: round r spans 2^(r-1) base rows, so
// every box sits centered between the two that feed it. Right on a wide
// screen, unusable on a phone with 8 base rows — the Championship ends up
// centered against all of them, hundreds of pixels below the fold.
//
// "packed" gives Round 1 and Round 2 one base row each, so both columns
// start at the top and Round 1 fans upward into Round 2; Final Four and
// Championship are then centered against Round 2's four rows, which is
// short enough to read normally. A 12-bear bracket is shaped this way on
// every screen (past the byes its Round 1 feeds Round 2 one-to-one), and a
// 16-bear bracket uses it on a phone.
export type BracketRowMode = "spread" | "packed";

// Row floors. The tallest box — two bears plus pick-percentage bars — runs
// about 132px, so neither of these should ever actually clamp; they just
// keep short rows (a TBD box) from collapsing.
export const ROW_MIN = 128;
export const COMPACT_ROW_MIN = 152;

export function bracketTemplateRows(round1Count: number, rowMin = ROW_MIN): string {
  return `auto repeat(${round1Count}, minmax(${rowMin}px, auto))`;
}

// `grid-row` for a matchup box. Base rows start at 2 (row 1 is the header).
export function boxGridRow(round: number, position: number, mode: BracketRowMode): string {
  if (mode === "packed") {
    if (round <= 2) return `${position + 1} / ${position + 2}`;
    if (round === 3) return `${2 * position} / ${2 * position + 2}`;
    return "2 / 6";
  }
  const span = 2 ** (round - 1);
  return `${(position - 1) * span + 2} / ${position * span + 2}`;
}
