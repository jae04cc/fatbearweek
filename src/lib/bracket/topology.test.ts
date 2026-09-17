import { describe, it, expect } from "vitest";
import {
  buildBracketTopology,
  resolveContestants,
  pruneInvalidPicks,
  POINTS_BY_ROUND,
  type BracketAssignment,
} from "./topology";

// A complete, valid 12-bear assignment: 8 bears in the 4 Round 1 matchups,
// 4 bye bears dropped into Round 2. Reused across the build tests.
function validAssignment(): BracketAssignment {
  return {
    round1: [
      { position: 1, bearAId: "b1", bearBId: "b2" },
      { position: 2, bearAId: "b3", bearBId: "b4" },
      { position: 3, bearAId: "b5", bearBId: "b6" },
      { position: 4, bearAId: "b7", bearBId: "b8" },
    ],
    round2Byes: [
      { position: 1, bearId: "b9" },
      { position: 2, bearId: "b10" },
      { position: 3, bearId: "b11" },
      { position: 4, bearId: "b12" },
    ],
  };
}

// A complete, valid 16-bear assignment: 16 bears across 8 Round 1 matchups and
// no byes.
function validAssignment16(): BracketAssignment {
  return {
    round1: Array.from({ length: 8 }, (_, i) => ({
      position: i + 1,
      bearAId: `b${i * 2 + 1}`,
      bearBId: `b${i * 2 + 2}`,
    })),
  };
}

// The matchup shape resolveContestants/pruneInvalidPicks actually read. Built by
// hand so a test states its bracket explicitly rather than depending on a seed.
type M = {
  id: string;
  round: number;
  position: number;
  bearAId: string | null;
  bearBId: string | null;
  feederMatchupAId: string | null;
  feederMatchupBId: string | null;
};

function m(partial: Partial<M> & Pick<M, "id" | "round" | "position">): M {
  return {
    bearAId: null,
    bearBId: null,
    feederMatchupAId: null,
    feederMatchupBId: null,
    ...partial,
  };
}

// One Round 1 matchup (A vs B) feeding a Round 2 matchup where a bye bear
// (BYE) faces that R1 winner. The R2 slot's B side is fed from the R1 result.
function r1FeedingR2(r2RawB: string | null = null): M[] {
  return [
    m({ id: "r1", round: 1, position: 1, bearAId: "A", bearBId: "B" }),
    m({ id: "r2", round: 2, position: 1, bearAId: "BYE", bearBId: r2RawB, feederMatchupBId: "r1" }),
  ];
}

describe("POINTS_BY_ROUND", () => {
  it("doubles each round from 1 to 8", () => {
    expect(POINTS_BY_ROUND).toEqual({ 1: 1, 2: 2, 3: 4, 4: 8 });
  });
});

describe("buildBracketTopology", () => {
  it("produces the 11-matchup single-elimination shape (4 + 4 + 2 + 1)", () => {
    const slots = buildBracketTopology(validAssignment());
    expect(slots).toHaveLength(11);
    expect(slots.filter((s) => s.round === 1)).toHaveLength(4);
    expect(slots.filter((s) => s.round === 2)).toHaveLength(4);
    expect(slots.filter((s) => s.round === 3)).toHaveLength(2);
    expect(slots.filter((s) => s.round === 4)).toHaveLength(1);
  });

  it("gives Round 1 fixed bears and no feeders", () => {
    const slots = buildBracketTopology(validAssignment());
    const r1p1 = slots.find((s) => s.round === 1 && s.position === 1)!;
    expect(r1p1.bearAId).toBe("b1");
    expect(r1p1.bearBId).toBe("b2");
    expect(r1p1.feederA).toBeUndefined();
    expect(r1p1.feederB).toBeUndefined();
  });

  it("seats each bye bear against the same-position Round 1 winner", () => {
    const slots = buildBracketTopology(validAssignment());
    const r2p2 = slots.find((s) => s.round === 2 && s.position === 2)!;
    expect(r2p2.bearAId).toBe("b10"); // the bye bear
    expect(r2p2.feederB).toEqual({ round: 1, position: 2 }); // winner of R1 p2
  });

  it("wires Final Four and Championship purely from feeders", () => {
    const slots = buildBracketTopology(validAssignment());
    const r3p1 = slots.find((s) => s.round === 3 && s.position === 1)!;
    expect(r3p1.feederA).toEqual({ round: 2, position: 1 });
    expect(r3p1.feederB).toEqual({ round: 2, position: 2 });

    const final = slots.find((s) => s.round === 4)!;
    expect(final.feederA).toEqual({ round: 3, position: 1 });
    expect(final.feederB).toEqual({ round: 3, position: 2 });
  });

  it("rejects the wrong number of Round 1 matchups", () => {
    const bad = validAssignment();
    bad.round1 = bad.round1.slice(0, 3);
    expect(() => buildBracketTopology(bad)).toThrow();
  });

  it("rejects a bear assigned to two slots", () => {
    const bad = validAssignment();
    bad.round2Byes![0].bearId = "b1"; // b1 is already in Round 1 position 1
    expect(() => buildBracketTopology(bad)).toThrow();
  });

  it("rejects the wrong number of bye bears", () => {
    const bad = validAssignment();
    bad.round2Byes = bad.round2Byes!.slice(0, 3);
    expect(() => buildBracketTopology(bad)).toThrow();
  });

  it("rejects a bye slot double-booked to the same position", () => {
    // Two byes on position 1 and none on position 4 — the counts still add up
    // to 4, so only the position-coverage check catches this.
    const bad = validAssignment();
    bad.round2Byes![3].position = 1;
    expect(() => buildBracketTopology(bad)).toThrow();
  });

  // --- 16-bear (no-bye) bracket ---

  it("produces the 15-matchup shape for 16 bears (8 + 4 + 2 + 1)", () => {
    const slots = buildBracketTopology(validAssignment16());
    expect(slots).toHaveLength(15);
    expect(slots.filter((s) => s.round === 1)).toHaveLength(8);
    expect(slots.filter((s) => s.round === 2)).toHaveLength(4);
    expect(slots.filter((s) => s.round === 3)).toHaveLength(2);
    expect(slots.filter((s) => s.round === 4)).toHaveLength(1);
  });

  it("pairs Round 1 winners into Round 2 with no byes", () => {
    const slots = buildBracketTopology(validAssignment16());
    const r2p1 = slots.find((s) => s.round === 2 && s.position === 1)!;
    expect(r2p1.bearAId).toBeUndefined();
    expect(r2p1.bearBId).toBeUndefined();
    expect(r2p1.feederA).toEqual({ round: 1, position: 1 });
    expect(r2p1.feederB).toEqual({ round: 1, position: 2 });

    const r2p4 = slots.find((s) => s.round === 2 && s.position === 4)!;
    expect(r2p4.feederA).toEqual({ round: 1, position: 7 });
    expect(r2p4.feederB).toEqual({ round: 1, position: 8 });
  });

  it("rejects a 16-bear bracket that still has byes assigned", () => {
    const bad = validAssignment16();
    bad.round2Byes = [{ position: 1, bearId: "bye" }];
    expect(() => buildBracketTopology(bad)).toThrow();
  });

  it("rejects the wrong number of Round 1 matchups for a no-bye bracket", () => {
    const bad = validAssignment16();
    bad.round1 = bad.round1.slice(0, 7);
    expect(() => buildBracketTopology(bad)).toThrow();
  });
});

describe("resolveContestants", () => {
  it("fills a fed slot from the decided winner, not the stored column", () => {
    const matchups = r1FeedingR2();
    const resolved = resolveContestants(matchups, { r1: "A" });
    const r2 = resolved.find((r) => r.id === "r2")!;
    expect(r2.bearAId).toBe("BYE"); // fixed side, unchanged
    expect(r2.bearBId).toBe("A"); // fed side = winner of r1
  });

  it("leaves a fed slot empty until its feeder is decided", () => {
    const matchups = r1FeedingR2();
    const resolved = resolveContestants(matchups, {}); // r1 undecided
    const r2 = resolved.find((r) => r.id === "r2")!;
    expect(r2.bearBId).toBeNull();
  });

  it("ALWAYS prefers the feeder over a stored bearBId (the personal-bracket invariant)", () => {
    // Real result overwrote r2's B column with "REAL", but this bracket's own
    // r1 pick was "A" — the person must keep seeing their pick, not reality.
    const matchups = r1FeedingR2("REAL");
    const resolved = resolveContestants(matchups, { r1: "A" });
    const r2 = resolved.find((r) => r.id === "r2")!;
    expect(r2.bearBId).toBe("A");
  });
});

describe("pruneInvalidPicks", () => {
  it("keeps a downstream pick that's still a legal contestant", () => {
    const matchups = r1FeedingR2();
    const pruned = pruneInvalidPicks(matchups, { r1: "A", r2: "A" });
    expect(pruned).toEqual({ r1: "A", r2: "A" });
  });

  it("clears a downstream pick invalidated by changing an earlier pick", () => {
    // r1 pick flipped to B, so r2's contestants become {BYE, B} — the old r2
    // pick of A is no longer possible and must be dropped.
    const matchups = r1FeedingR2();
    const pruned = pruneInvalidPicks(matchups, { r1: "B", r2: "A" });
    expect(pruned).toEqual({ r1: "B" });
  });

  it("leaves untouched picks that are still valid after an upstream change", () => {
    const matchups = r1FeedingR2();
    const pruned = pruneInvalidPicks(matchups, { r1: "B", r2: "B" });
    expect(pruned).toEqual({ r1: "B", r2: "B" });
  });
});
