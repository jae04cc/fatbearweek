import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matchups } from "@/lib/db/schema";
import { auth } from "@/auth";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [allMatchups, allPicks, allUsers] = await Promise.all([
    db.query.matchups.findMany({ orderBy: [asc(matchups.round), asc(matchups.position)] }),
    db.query.userPicks.findMany(),
    db.query.users.findMany(),
  ]);

  // Admins are pool operators, not players — excluded from player-facing stats
  const playerIds = new Set(allUsers.filter((u) => !u.isAdmin).map((u) => u.id));
  const playerPicks = allPicks.filter((p) => playerIds.has(p.userId));

  const pickStats: Record<string, Record<string, number>> = {};
  for (const p of playerPicks) {
    pickStats[p.matchupId] ??= {};
    pickStats[p.matchupId][p.pickedBearId] = (pickStats[p.matchupId][p.pickedBearId] ?? 0) + 1;
  }

  return NextResponse.json({
    matchups: allMatchups,
    pickStats,
    totalPlayers: new Set(playerPicks.map((p) => p.userId)).size,
  });
}
