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
  // The 4 Round 1 matchups, each an explicit pair of non-bye bears
  round1: { position: number; bearAId: string; bearBId: string }[];
  // Which bye bear sits in each Round 2 slot, facing that position's Round 1 winner
  round2Byes: { position: number; bearId: string }[];
}

// Builds the 11-matchup bracket shape from an admin-supplied assignment — the
// real bracket pairings are published by NPS and entered by hand, never
// guessed at from bear order. Round 3/4 shape is always the same fixed
// single-elimination structure once Round 1 and the byes are assigned.
export function buildBracketTopology(assignment: BracketAssignment): BracketTopologySlot[] {
  const { round1, round2Byes } = assignment;

  if (round1.length !== 4) {
    throw new Error(`Expected exactly 4 Round 1 matchups, got ${round1.length}`);
  }
  if (round2Byes.length !== 4) {
    throw new Error(`Expected exactly 4 bye bears assigned to Round 2, got ${round2Byes.length}`);
  }

  const positions1 = new Set(round1.map((m) => m.position));
  const positions2 = new Set(round2Byes.map((b) => b.position));
  if (positions1.size !== 4 || ![1, 2, 3, 4].every((p) => positions1.has(p))) {
    throw new Error("Round 1 matchups must cover positions 1-4 exactly once each");
  }
  if (positions2.size !== 4 || ![1, 2, 3, 4].every((p) => positions2.has(p))) {
    throw new Error("Round 2 bye slots must cover positions 1-4 exactly once each");
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
  if (usedBearIds.size !== 12) {
    throw new Error(`Expected exactly 12 bears assigned across the bracket, got ${usedBearIds.size}`);
  }

  const slots: BracketTopologySlot[] = [];

  // Round 1: 4 matchups among the 8 non-bye bears, exactly as assigned
  for (const m of round1) {
    slots.push({ round: 1, position: m.position, bearAId: m.bearAId, bearBId: m.bearBId });
  }

  // Round 2: each bye bear faces the winner of the same-position Round 1 matchup
  for (const b of round2Byes) {
    slots.push({ round: 2, position: b.position, bearAId: b.bearId, feederB: { round: 1, position: b.position } });
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

// Given the bracket's fixed shape and a set of "decided" picks (either a
// user's own hypothetical picks, or the real recorded winners), works out
// which two bears are actually facing off in every matchup — including
// rounds whose contestants are only known once an earlier round is decided.
export function resolveContestants(
  matchups: Pick<Matchup, "id" | "round" | "position" | "bearAId" | "bearBId" | "feederMatchupAId" | "feederMatchupBId">[],
  decidedFor: Record<string, string | undefined>
): ResolvedMatchup[] {
  const winnerFor = (matchupId: string): string | null => decidedFor[matchupId] ?? null;

  return matchups.map((m) => ({
    id: m.id,
    round: m.round,
    position: m.position,
    bearAId: m.bearAId ?? (m.feederMatchupAId ? winnerFor(m.feederMatchupAId) : null),
    bearBId: m.bearBId ?? (m.feederMatchupBId ? winnerFor(m.feederMatchupBId) : null),
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
    const bearAId = m.bearAId ?? (m.feederMatchupAId ? winnerFor(m.feederMatchupAId) : null);
    const bearBId = m.bearBId ?? (m.feederMatchupBId ? winnerFor(m.feederMatchupBId) : null);
    const picked = next[m.id];
    if (picked && picked !== bearAId && picked !== bearBId) {
      delete next[m.id];
    }
  }

  return next;
}
