import type { Matchup } from "@/lib/db/schema";

// Round 1 = 1pt, Round 2 = 2pt, Round 3 (Final Four) = 4pt, Round 4 (Championship) = 8pt
export const POINTS_BY_ROUND: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8 };

export interface BracketTopologySlot {
  round: number;
  position: number;
  bearAId?: string;
  bearBId?: string;
  feederA?: { round: number; position: number };
  feederB?: { round: number; position: number };
}

export interface BracketAssignment {
  // The Round 1 matchups, each an explicit pair of non-bye bears — 4 for a
  // 12-bear bracket, 8 for a 16-bear bracket.
  round1: { position: number; bearAId: string; bearBId: string }[];
  // Which bye bear sits in each Round 2 slot, facing that position's Round 1
  // winner. Only used by the 12-bear bracket; omitted/empty for 16 bears.
  round2Byes?: { position: number; bearId: string }[];
}

// Builds the bracket shape from an admin-supplied assignment — the real bracket
// pairings are published by NPS and entered by hand, never guessed at from bear
// order. Two shapes are supported, both fixed single-elimination:
//   - 12 bears: 4 Round 1 matchups + 4 byes  → 4 + 4 + 2 + 1 = 11 matchups
//   - 16 bears: 8 Round 1 matchups, no byes  → 8 + 4 + 2 + 1 = 15 matchups
// Rounds 3 (Final Four) and 4 (Championship) are identical in both.
export function buildBracketTopology(assignment: BracketAssignment): BracketTopologySlot[] {
  const round1 = assignment.round1 ?? [];
  const round2Byes = assignment.round2Byes ?? [];
  const hasByes = round2Byes.length > 0;
  const n1 = round1.length;

  if (hasByes) {
    if (n1 !== 4) throw new Error(`A bye bracket needs exactly 4 Round 1 matchups, got ${n1}`);
    if (round2Byes.length !== 4) throw new Error(`Expected exactly 4 bye bears assigned to Round 2, got ${round2Byes.length}`);
  } else if (n1 !== 8) {
    throw new Error(`A no-bye bracket needs exactly 8 Round 1 matchups, got ${n1}`);
  }

  const positions1 = new Set(round1.map((m) => m.position));
  const expected1 = Array.from({ length: n1 }, (_, i) => i + 1);
  if (positions1.size !== n1 || !expected1.every((p) => positions1.has(p))) {
    throw new Error(`Round 1 matchups must cover positions 1-${n1} exactly once each`);
  }
  if (hasByes) {
    const positions2 = new Set(round2Byes.map((b) => b.position));
    if (positions2.size !== 4 || ![1, 2, 3, 4].every((p) => positions2.has(p))) {
      throw new Error("Round 2 bye slots must cover positions 1-4 exactly once each");
    }
  }

  const usedBearIds = new Set<string>();
  for (const m of round1) {
    for (const bearId of [m.bearAId, m.bearBId]) {
      if (usedBearIds.has(bearId)) throw new Error("Each bear can only be assigned to one bracket slot");
      usedBearIds.add(bearId);
    }
  }
  for (const b of round2Byes) {
    if (usedBearIds.has(b.bearId)) throw new Error("Each bear can only be assigned to one bracket slot");
    usedBearIds.add(b.bearId);
  }
  const expectedBears = hasByes ? 12 : 16;
  if (usedBearIds.size !== expectedBears) {
    throw new Error(`Expected exactly ${expectedBears} bears assigned across the bracket, got ${usedBearIds.size}`);
  }

  const slots: BracketTopologySlot[] = [];

  // Round 1: matchups among the non-bye bears, exactly as assigned
  for (const m of round1) {
    slots.push({ round: 1, position: m.position, bearAId: m.bearAId, bearBId: m.bearBId });
  }

  // Round 2 always has 4 matchups.
  if (hasByes) {
    // 12-bear: each bye bear faces the winner of the same-position Round 1 matchup
    for (const b of round2Byes) {
      slots.push({ round: 2, position: b.position, bearAId: b.bearId, feederB: { round: 1, position: b.position } });
    }
  } else {
    // 16-bear: pair up the 8 Round 1 winners
    for (let i = 0; i < n1 / 2; i++) {
      slots.push({
        round: 2,
        position: i + 1,
        feederA: { round: 1, position: i * 2 + 1 },
        feederB: { round: 1, position: i * 2 + 2 },
      });
    }
  }

  // Round 3 (Final Four): 2 matchups from round-2 winners
  for (let i = 0; i < 2; i++) {
    slots.push({
      round: 3,
      position: i + 1,
      feederA: { round: 2, position: i * 2 + 1 },
      feederB: { round: 2, position: i * 2 + 2 },
    });
  }

  // Round 4 (Championship): 1 matchup from round-3 winners
  slots.push({
    round: 4,
    position: 1,
    feederA: { round: 3, position: 1 },
    feederB: { round: 3, position: 2 },
  });

  return slots;
}

export interface ResolvedMatchup {
  id: string;
  round: number;
  position: number;
  bearAId: string | null;
  bearBId: string | null;
}

// Given the bracket's fixed shape and a set of "decided" picks — always a
// single bracket's own hypothesis, e.g. one user's own picks, NEVER a mix —
// works out which two bears are facing off in every matchup, including
// rounds whose contestants are only known once an earlier round is decided.
//
// Slots with a feeder pointer ALWAYS resolve from `decidedFor`, even once
// the matchup's own bearAId/bearBId has since been overwritten with the
// REAL winner (that happens the moment an admin marks a real result — see
// admin/matchups/[id]/route.ts's cascade). A personal bracket must keep
// showing what that person actually picked, not reality, or their bracket
// would appear to silently rewrite itself as real results come in. Only
// slots with NO feeder (Round 1's two fixed bears, Round 2's fixed bye) ever
// fall back to the raw column, since those were never anyone's prediction.
export function resolveContestants(
  matchups: Pick<Matchup, "id" | "round" | "position" | "bearAId" | "bearBId" | "feederMatchupAId" | "feederMatchupBId">[],
  decidedFor: Record<string, string | undefined>
): ResolvedMatchup[] {
  const winnerFor = (matchupId: string): string | null => decidedFor[matchupId] ?? null;

  return matchups.map((m) => ({
    id: m.id,
    round: m.round,
    position: m.position,
    bearAId: m.feederMatchupAId ? winnerFor(m.feederMatchupAId) : m.bearAId,
    bearBId: m.feederMatchupBId ? winnerFor(m.feederMatchupBId) : m.bearBId,
  }));
}

// When a user changes an earlier-round pick, any later-round pick that's no
// longer a legal contestant (because it depended on the old pick) must be
// cleared. Processing rounds in ascending order lets each round's pruning
// decision feed correctly into the next round's resolution, in one pass.
export function pruneInvalidPicks(
  matchups: Pick<Matchup, "id" | "round" | "position" | "bearAId" | "bearBId" | "feederMatchupAId" | "feederMatchupBId">[],
  picks: Record<string, string>
): Record<string, string> {
  const ordered = [...matchups].sort((a, b) => a.round - b.round || a.position - b.position);
  const next = { ...picks };
  const winnerFor = (matchupId: string): string | null => next[matchupId] ?? null;

  for (const m of ordered) {
    const bearAId = m.feederMatchupAId ? winnerFor(m.feederMatchupAId) : m.bearAId;
    const bearBId = m.feederMatchupBId ? winnerFor(m.feederMatchupBId) : m.bearBId;
    const picked = next[m.id];
    if (picked && picked !== bearAId && picked !== bearBId) {
      delete next[m.id];
    }
  }

  return next;
}
