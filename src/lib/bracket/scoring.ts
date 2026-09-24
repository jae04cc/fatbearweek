import type { Matchup, UserPick, User } from "@/lib/db/schema";
import { POINTS_BY_ROUND } from "./topology";

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  points: number;
  correctByRound: Record<number, number>;
  maxRemaining: number;
  maxPossible: number;
}

type ScoringMatchup = Pick<Matchup, "id" | "round" | "winnerBearId" | "bearAId" | "bearBId">;

// Scoring is a direct comparison per matchup — no bracket-shape knowledge
// needed here, since byes simply never have a round-1 matchup row to score.
export function computeLeaderboard(
  users: Pick<User, "id" | "displayName" | "username">[],
  matchups: ScoringMatchup[],
  allPicks: Pick<UserPick, "userId" | "matchupId" | "pickedBearId">[]
): LeaderboardEntry[] {
  const matchupById = new Map(matchups.map((m) => [m.id, m]));

  // Every bear that has lost a real matchup. A pick on one of them is dead in
  // every later round, even where that box's real contestants aren't known yet.
  const eliminated = new Set<string>();
  for (const m of matchups) {
    if (!m.winnerBearId) continue;
    for (const bearId of [m.bearAId, m.bearBId]) {
      if (bearId && bearId !== m.winnerBearId) eliminated.add(bearId);
    }
  }
  const picksByUser = new Map<string, typeof allPicks>();
  for (const pick of allPicks) {
    const list = picksByUser.get(pick.userId) ?? [];
    list.push(pick);
    picksByUser.set(pick.userId, list);
  }

  return users
    .map((user) => {
      const picks = picksByUser.get(user.id) ?? [];
      let points = 0;
      let maxRemaining = 0;
      const correctByRound: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

      for (const pick of picks) {
        const matchup = matchupById.get(pick.matchupId);
        if (!matchup) continue;
        const roundPoints = POINTS_BY_ROUND[matchup.round] ?? 0;

        if (matchup.winnerBearId) {
          if (matchup.winnerBearId === pick.pickedBearId) {
            points += roundPoints;
            correctByRound[matchup.round] = (correctByRound[matchup.round] ?? 0) + 1;
          }
          continue;
        }

        // Undecided: still worth its round's points unless the picked bear
        // can no longer get here. That's the case once they've lost anywhere,
        // or once the box already holds two other bears.
        const bothRealKnown = Boolean(matchup.bearAId && matchup.bearBId);
        const notContesting =
          bothRealKnown && pick.pickedBearId !== matchup.bearAId && pick.pickedBearId !== matchup.bearBId;
        const busted = eliminated.has(pick.pickedBearId) || notContesting;
        if (!busted) {
          maxRemaining += roundPoints;
        }
      }

      return {
        userId: user.id,
        displayName: user.displayName ?? user.username,
        points,
        correctByRound,
        maxRemaining,
        maxPossible: points + maxRemaining,
      };
    })
    .sort((a, b) => b.points - a.points);
}
