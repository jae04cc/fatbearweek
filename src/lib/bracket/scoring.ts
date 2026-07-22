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

        // Undecided — still eligible for "best case" points unless this pick
        // is already provably impossible (the real bracket has progressed
        // far enough to show this pick's bear isn't even a real contestant
        // here, because an earlier real result eliminated them already).
        const bothRealKnown = Boolean(matchup.bearAId && matchup.bearBId);
        const busted = bothRealKnown && pick.pickedBearId !== matchup.bearAId && pick.pickedBearId !== matchup.bearBId;
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
