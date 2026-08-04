import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matchups } from "@/lib/db/schema";
import { requireAuth } from "@/lib/adminGuard";
import { isBracketRevealed } from "@/lib/settings";
import { playerIdSet, tallyPickStats } from "@/lib/stats";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  // Gated server-side (see /api/bears) — the results bracket is built from
  // this, so it stays hidden for non-admins until the bracket reveals.
  if (!session.user.isAdmin && !(await isBracketRevealed())) {
    return NextResponse.json({ matchups: [], pickStats: {}, totalPlayers: 0 });
  }

  const [allMatchups, allPicks, allUsers] = await Promise.all([
    db.query.matchups.findMany({ orderBy: [asc(matchups.round), asc(matchups.position)] }),
    db.query.userPicks.findMany(),
    db.query.users.findMany(),
  ]);

  const playerIds = playerIdSet(allUsers);
  const playerPicks = allPicks.filter((p) => playerIds.has(p.userId));
  const pickStats = tallyPickStats(playerPicks);

  return NextResponse.json({
    matchups: allMatchups,
    pickStats,
    totalPlayers: new Set(playerPicks.map((p) => p.userId)).size,
  });
}
