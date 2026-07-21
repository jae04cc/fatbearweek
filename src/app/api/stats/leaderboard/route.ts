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
  return NextResponse.json({ leaderboard });
}
