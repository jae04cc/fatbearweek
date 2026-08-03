import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { computeLeaderboard } from "@/lib/bracket/scoring";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [allUsers, allMatchups, allPicks] = await Promise.all([
    db.query.users.findMany(),
    db.query.matchups.findMany(),
    db.query.userPicks.findMany(),
  ]);

  // Only the bootstrap operator account is excluded — every other user
  // (including other admins) is a real player
  const players = allUsers.filter((u) => !u.isBootstrap);
  const playerIds = new Set(players.map((u) => u.id));
  const playerPicks = allPicks.filter((p) => playerIds.has(p.userId));

  const leaderboard = computeLeaderboard(players, allMatchups, playerPicks);

  // Bracket-completion progress rides along here rather than in its own route:
  // the results page already fetches this, and everything it needs (matchups +
  // picks) is loaded above, so it costs no extra queries. A bracket only counts
  // as complete once every matchup has a saved pick — partial brackets don't.
  const pickCountByUser = new Map<string, number>();
  for (const p of playerPicks) {
    pickCountByUser.set(p.userId, (pickCountByUser.get(p.userId) ?? 0) + 1);
  }
  const completedCount =
    allMatchups.length > 0
      ? players.filter((u) => (pickCountByUser.get(u.id) ?? 0) === allMatchups.length).length
      : 0;

  return NextResponse.json({
    leaderboard,
    completed: { completed: completedCount, total: players.length },
  });
}
