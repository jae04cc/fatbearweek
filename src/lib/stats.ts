import type { User, UserPick } from "@/lib/db/schema";

// Only the single bootstrap operator account is excluded from stats — every
// other user (including promoted admins) is a real player. Centralised here so
// the definition of "player" can't drift between the routes that count picks.
export function playerIdSet(users: Pick<User, "id" | "isBootstrap">[]): Set<string> {
  return new Set(users.filter((u) => !u.isBootstrap).map((u) => u.id));
}

// Tally of how many players picked each bear, per matchup:
//   { [matchupId]: { [bearId]: count } }
// Used identically by /api/matchups and /api/stats/picks; kept in one place so
// the two can't compute pick percentages differently.
export function tallyPickStats(
  picks: Pick<UserPick, "matchupId" | "pickedBearId">[]
): Record<string, Record<string, number>> {
  const stats: Record<string, Record<string, number>> = {};
  for (const p of picks) {
    stats[p.matchupId] ??= {};
    stats[p.matchupId][p.pickedBearId] = (stats[p.matchupId][p.pickedBearId] ?? 0) + 1;
  }
  return stats;
}
