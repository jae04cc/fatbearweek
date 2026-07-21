import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matchups, userPicks } from "@/lib/db/schema";
import { auth } from "@/auth";
import { getCurrentRound } from "@/lib/settings";
import { asc, eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentRound = await getCurrentRound();
  const roundMatchups = await db.query.matchups.findMany({
    where: eq(matchups.round, currentRound),
    orderBy: [asc(matchups.position)],
  });

  const matchupIds = roundMatchups.map((m) => m.id);
  const [picks, allUsers] = await Promise.all([
    matchupIds.length > 0 ? db.query.userPicks.findMany({ where: inArray(userPicks.matchupId, matchupIds) }) : Promise.resolve([]),
    db.query.users.findMany(),
  ]);

  // Only the bootstrap operator account is excluded — every other user
  // (including other admins) is a real player
  const playerIds = new Set(allUsers.filter((u) => !u.isBootstrap).map((u) => u.id));
  const playerPicks = picks.filter((p) => playerIds.has(p.userId));

  const pickStats: Record<string, Record<string, number>> = {};
  for (const p of playerPicks) {
    pickStats[p.matchupId] ??= {};
    pickStats[p.matchupId][p.pickedBearId] = (pickStats[p.matchupId][p.pickedBearId] ?? 0) + 1;
  }

  return NextResponse.json({ currentRound, matchups: roundMatchups, pickStats });
}
