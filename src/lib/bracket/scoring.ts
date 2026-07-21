import type { Matchup, UserPick, User } from "@/lib/db/schema";
import { POINTS_BY_ROUND } from "./topology";

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  points: number;
  correctByRound: Record<number, number>;
}

// Scoring is a direct comparison per matchup — no bracket-shape knowledge
// needed here, since byes simply never have a round-1 matchup row to score.
export function computeLeaderboard(
  users: Pick<User, "id" | "displayName" | "username">[],
  matchups: Pick<Matchup, "id" | "round" | "winnerBearId">[],
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
      const correctByRound: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
      for (const pick of picks) {
        const matchup = matchupById.get(pick.matchupId);
        if (!matchup || !matchup.winnerBearId) continue;
        if (matchup.winnerBearId === pick.pickedBearId) {
          points += POINTS_BY_ROUND[matchup.round] ?? 0;
          correctByRound[matchup.round] = (correctByRound[matchup.round] ?? 0) + 1;
        }
      }
      return { userId: user.id, displayName: user.displayName ?? user.username, points, correctByRound };
    })
    .sort((a, b) => b.points - a.points);
}
