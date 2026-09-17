import { describe, it, expect } from "vitest";
import {
  buildBracketTopology,
  resolveContestants,
  pruneInvalidPicks,
  POINTS_BY_ROUND,
  type BracketAssignment,
} from "./topology";
import { computeLeaderboard } from "./scoring";

// End-to-end scoring, driven through the same pipeline the app uses: seed a
// bracket from an admin assignment, have players fill it in the way the
// /bracket page does, mark real results the way the admin cascade does, then
// score it. The unit tests in topology.test.ts and scoring.test.ts each cover
// one of those steps in isolation; these run the whole thing, which is the
// only way to catch a bracket shape that seeds fine but mis-scores — the risk
// that came with supporting a 16-bear first round alongside the 12-bear one.

type Row = {
  id: string;
  round: number;
  position: number;
  bearAId: string | null;
  bearBId: string | null;
  feederMatchupAId: string | null;
  feederMatchupBId: string | null;
  winnerBearId: string | null;
};

const bear = (n: number) => `bear-${n}`;
const byRoundPosition = (a: Row, b: Row) => a.round - b.round || a.position - b.position;

// Mirrors api/admin/bracket/seed: topology → matchup rows, with feeder
// pointers resolved to row ids. Real ids are random; here they're
// `r<round>p<position>` so a failure message says which box broke.
function seed(assignment: BracketAssignment): Row[] {
  const idFor = (round: number, position: number) => `r${round}p${position}`;
  return buildBracketTopology(assignment)
    .map((slot) => ({
      id: idFor(slot.round, slot.position),
      round: slot.round,
      position: slot.position,
      bearAId: slot.bearAId ?? null,
      bearBId: slot.bearBId ?? null,
      feederMatchupAId: slot.feederA ? idFor(slot.feederA.round, slot.feederA.position) : null,
      feederMatchupBId: slot.feederB ? idFor(slot.feederB.round, slot.feederB.position) : null,
      winnerBearId: null,
    }))
    .sort(byRoundPosition);
}

// 8 Round 1 matchups among bears 1-16, no byes.
function flat16(): BracketAssignment {
  return {
    round1: Array.from({ length: 8 }, (_, i) => ({
      position: i + 1,
      bearAId: bear(i * 2 + 1),
      bearBId: bear(i * 2 + 2),
    })),
  };
}

// 4 Round 1 matchups among bears 1-8, with bears 9-12 on byes.
function byes12(): BracketAssignment {
  return {
    round1: Array.from({ length: 4 }, (_, i) => ({
      position: i + 1,
      bearAId: bear(i * 2 + 1),
      bearBId: bear(i * 2 + 2),
    })),
    round2Byes: Array.from({ length: 4 }, (_, i) => ({ position: i + 1, bearId: bear(9 + i) })),
  };
}

// The truth this tournament plays out to: the lower-numbered bear always
// wins. Arbitrary, but it makes every round's real winner predictable.
const favourite = (a: string, b: string) => (Number(a.split("-")[1]) < Number(b.split("-")[1]) ? a : b);

// Mirrors api/admin/matchups/[id] PATCH: record the winner, and push it into
// whichever slot of the downstream matchup this one feeds.
function decide(rows: Row[], matchupId: string, winnerBearId: string): Row[] {
  const m = rows.find((r) => r.id === matchupId);
  if (!m) throw new Error(`No such matchup ${matchupId}`);
  // The same guard the route applies — a winner has to be one of the two
  // bears actually standing in that box.
  if (winnerBearId !== m.bearAId && winnerBearId !== m.bearBId) {
    throw new Error(`${winnerBearId} isn't a contestant in ${matchupId} (${m.bearAId} vs ${m.bearBId})`);
  }
  return rows.map((r) => {
    if (r.id === matchupId) return { ...r, winnerBearId };
    if (r.feederMatchupAId === matchupId) return { ...r, bearAId: winnerBearId };
    if (r.feederMatchupBId === matchupId) return { ...r, bearBId: winnerBearId };
    return r;
  });
}

function decideRound(rows: Row[], round: number): Row[] {
  let next = rows;
  for (const m of rows.filter((r) => r.round === round).sort(byRoundPosition)) {
    const live = next.find((r) => r.id === m.id)!;
    if (!live.bearAId || !live.bearBId) {
      throw new Error(`${m.id} has no contestants to decide — feeders didn't cascade`);
    }
    next = decide(next, m.id, favourite(live.bearAId, live.bearBId));
  }
  return next;
}

// Mirrors the /bracket page: pick a box, then run the whole pick set back
// through pruneInvalidPicks, round by round so each round's choice resolves
// the next round's contestants.
function fillBracket(rows: Row[], choose: (options: [string, string], matchup: Row) => string): Record<string, string> {
  let picks: Record<string, string> = {};
  for (const m of [...rows].sort(byRoundPosition)) {
    const resolved = resolveContestants(rows, picks).find((r) => r.id === m.id)!;
    if (!resolved.bearAId || !resolved.bearBId) {
      throw new Error(`${m.id} never resolved two contestants — the bracket can't be filled in`);
    }
    picks = pruneInvalidPicks(rows, {
      ...picks,
      [m.id]: choose([resolved.bearAId, resolved.bearBId], m),
    });
  }
  return picks;
}

const pickFavourites = (options: [string, string]) => favourite(options[0], options[1]);
const toPicks = (userId: string, picks: Record<string, string>) =>
  Object.entries(picks).map(([matchupId, pickedBearId]) => ({ userId, matchupId, pickedBearId }));
const player = (id: string) => ({ id, displayName: id, username: id });

// Every point in the pool: one per Round 1 matchup, then 2/4/8 up the tree.
function poolTotal(rows: Row[]): number {
  return rows.reduce((sum, m) => sum + (POINTS_BY_ROUND[m.round] ?? 0), 0);
}

describe("16-bear tournament", () => {
  it("seeds 15 matchups and fills in end to end", () => {
    const rows = seed(flat16());
    expect(rows).toHaveLength(15);
    expect(rows.filter((r) => r.round === 1)).toHaveLength(8);
    expect(rows.filter((r) => r.round === 2)).toHaveLength(4);
    expect(rows.filter((r) => r.round === 3)).toHaveLength(2);
    expect(rows.filter((r) => r.round === 4)).toHaveLength(1);

    // fillBracket throws if any box fails to resolve two contestants, so a
    // pick for every matchup means the whole feeder chain wired up. This is
    // also what "Brackets completed" counts: one saved pick per matchup.
    const picks = fillBracket(rows, pickFavourites);
    expect(Object.keys(picks)).toHaveLength(rows.length);
  });

  it("puts 32 points in the pool", () => {
    // 8x1 + 4x2 + 2x4 + 1x8 — four more than a 12-bear bracket, all from the
    // extra Round 1 matchups.
    expect(poolTotal(seed(flat16()))).toBe(32);
  });

  it("resolves each Round 2 box from its two Round 1 winners", () => {
    const rows = seed(flat16());
    const picks = { r1p1: bear(2), r1p2: bear(4) };
    const r2p1 = resolveContestants(rows, picks).find((r) => r.id === "r2p1")!;
    expect([r2p1.bearAId, r2p1.bearBId]).toEqual([bear(2), bear(4)]);
  });

  it("scores a perfect bracket at the full 32", () => {
    let rows = seed(flat16());
    const picks = fillBracket(rows, pickFavourites);
    for (const round of [1, 2, 3, 4]) rows = decideRound(rows, round);

    const [entry] = computeLeaderboard([player("perfect")], rows, toPicks("perfect", picks));
    expect(entry.points).toBe(32);
    expect(entry.maxRemaining).toBe(0);
    expect(entry.correctByRound).toEqual({ 1: 8, 2: 4, 3: 2, 4: 1 });
  });

  it("moves points out of remaining and into the score, round by round", () => {
    let rows = seed(flat16());
    const picks = toPicks("perfect", fillBracket(rows, pickFavourites));

    // Nothing decided yet: the whole pool is still up for grabs.
    const start = computeLeaderboard([player("perfect")], rows, picks)[0];
    expect(start.points).toBe(0);
    expect(start.maxRemaining).toBe(32);

    const expected = [
      { round: 1, points: 8 },
      { round: 2, points: 16 },
      { round: 3, points: 24 },
      { round: 4, points: 32 },
    ];
    for (const stage of expected) {
      rows = decideRound(rows, stage.round);
      const entry = computeLeaderboard([player("perfect")], rows, picks)[0];
      expect(entry.points).toBe(stage.points);
      // The invariant behind the results page's "PPR": for a bracket that's
      // still perfect, banked plus remaining always adds back to the pool.
      expect(entry.points + entry.maxRemaining).toBe(32);
      expect(entry.maxPossible).toBe(32);
    }
  });

  it("writes off a busted run only as each round proves it dead", () => {
    // This player backs bear-2 all the way — a bear that loses in Round 1.
    // Their later picks can't be written off the moment bear-2 loses: a
    // Final Four box has no real contestants until Round 2 is decided, so
    // until then those points are still notionally live. Getting this wrong
    // in either direction is what makes "points remaining" lie.
    let rows = seed(flat16());
    const loyalist = fillBracket(rows, (options, m) =>
      options.includes(bear(2)) ? bear(2) : pickFavourites(options)
    );
    const picks = toPicks("loyalist", loyalist);
    expect([loyalist.r1p1, loyalist.r2p1, loyalist.r3p1, loyalist.r4p1]).toEqual([
      bear(2),
      bear(2),
      bear(2),
      bear(2),
    ]);

    rows = decideRound(rows, 1);
    let entry = computeLeaderboard([player("loyalist")], rows, picks)[0];
    // 7 of 8 Round 1 picks right. Round 2 position 1 is now provably dead
    // (bear-1 vs bear-3, and they hold bear-2), so its 2 points leave
    // remaining; Rounds 3 and 4 are still unresolved, so theirs don't.
    expect(entry.points).toBe(7);
    expect(entry.maxRemaining).toBe(3 * 2 + 4 + 4 + 8);
    expect(entry.maxPossible).toBe(29);

    rows = decideRound(rows, 2);
    entry = computeLeaderboard([player("loyalist")], rows, picks)[0];
    // Final Four position 1 is bear-1 vs bear-5 now — the bear-2 pick there
    // is dead too, so its 4 points drop out.
    expect(entry.points).toBe(7 + 3 * 2);
    expect(entry.maxRemaining).toBe(4 + 8);
    expect(entry.maxPossible).toBe(25);

    rows = decideRound(rows, 3);
    entry = computeLeaderboard([player("loyalist")], rows, picks)[0];
    expect(entry.points).toBe(13 + 4);
    expect(entry.maxRemaining).toBe(0); // the championship pick is dead as well
    expect(entry.maxPossible).toBe(17);

    rows = decideRound(rows, 4);
    entry = computeLeaderboard([player("loyalist")], rows, picks)[0];
    expect(entry.points).toBe(17);
    expect(entry.maxPossible).toBe(17);
  });

  it("ranks a perfect bracket above a busted one", () => {
    let rows = seed(flat16());
    const perfect = toPicks("perfect", fillBracket(rows, pickFavourites));
    const loyalist = toPicks(
      "loyalist",
      fillBracket(rows, (options) => (options.includes(bear(2)) ? bear(2) : pickFavourites(options)))
    );
    for (const round of [1, 2, 3, 4]) rows = decideRound(rows, round);

    const board = computeLeaderboard([player("loyalist"), player("perfect")], rows, [...perfect, ...loyalist]);
    expect(board.map((e) => e.userId)).toEqual(["perfect", "loyalist"]);
    expect(board.map((e) => e.points)).toEqual([32, 17]);
  });

  it("counts remaining only for picks a half-finished bracket actually has", () => {
    // Picks close before the tournament starts, so this is an edge case — but
    // it's what the results page shows for anyone who never hit Save on the
    // back half: remaining reflects their saved picks, not the pool.
    const rows = seed(flat16());
    const full = fillBracket(rows, pickFavourites);
    const round1Only = Object.fromEntries(
      Object.entries(full).filter(([id]) => rows.find((r) => r.id === id)!.round === 1)
    );

    const [entry] = computeLeaderboard([player("partial")], rows, toPicks("partial", round1Only));
    expect(Object.keys(round1Only)).toHaveLength(8);
    expect(entry.maxRemaining).toBe(8);
    expect(entry.maxPossible).toBe(8);
  });

  it("clears the later picks that depended on a changed Round 1 pick", () => {
    const rows = seed(flat16());
    const picks = fillBracket(rows, pickFavourites);
    expect(picks.r4p1).toBe(bear(1));

    // Switch Round 1 position 1 to the other bear: everything downstream that
    // rode on bear-1 has to go, and nothing in the other half may move.
    const pruned = pruneInvalidPicks(rows, { ...picks, r1p1: bear(2) });
    expect(pruned.r1p1).toBe(bear(2));
    expect(pruned.r2p1).toBeUndefined();
    expect(pruned.r3p1).toBeUndefined();
    expect(pruned.r4p1).toBeUndefined();
    expect(pruned.r2p2).toBe(picks.r2p2);
    expect(pruned.r3p2).toBe(picks.r3p2);
    expect(Object.keys(pruned)).toHaveLength(Object.keys(picks).length - 3);
  });

  it("keeps a later pick that survives the change", () => {
    const rows = seed(flat16());
    const picks = fillBracket(rows, pickFavourites);
    // Round 2 position 1 is bear-1 vs bear-3; re-picking bear-3 there leaves
    // bear-1 still in play elsewhere but ends its own run, so the Final Four
    // and Championship picks riding on bear-1 must clear.
    const pruned = pruneInvalidPicks(rows, { ...picks, r2p1: bear(3) });
    expect(pruned.r1p1).toBe(bear(1));
    expect(pruned.r2p1).toBe(bear(3));
    expect(pruned.r3p1).toBeUndefined();
    expect(pruned.r4p1).toBeUndefined();
  });
});

describe("12-bear tournament", () => {
  it("still seeds 11 matchups worth 28 points", () => {
    const rows = seed(byes12());
    expect(rows).toHaveLength(11);
    expect(poolTotal(rows)).toBe(28);
  });

  it("still scores a perfect bracket at the full 28", () => {
    let rows = seed(byes12());
    const picks = fillBracket(rows, pickFavourites);
    expect(Object.keys(picks)).toHaveLength(11);
    for (const round of [1, 2, 3, 4]) rows = decideRound(rows, round);

    const [entry] = computeLeaderboard([player("perfect")], rows, toPicks("perfect", picks));
    expect(entry.points).toBe(28);
    expect(entry.maxRemaining).toBe(0);
    // Only 4 Round 1 matchups to get right — the byes have none to score.
    expect(entry.correctByRound).toEqual({ 1: 4, 2: 4, 3: 2, 4: 1 });
  });

  it("puts a bye bear in Round 2 against the Round 1 winner", () => {
    const rows = seed(byes12());
    const r2p1 = resolveContestants(rows, { r1p1: bear(2) }).find((r) => r.id === "r2p1")!;
    expect([r2p1.bearAId, r2p1.bearBId]).toEqual([bear(9), bear(2)]);
  });
});
