import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matchups, userPicks } from "@/lib/db/schema";
import { requireAuth } from "@/lib/adminGuard";
import { getCurrentRound, isBracketRevealed } from "@/lib/settings";
import { playerIdSet, tallyPickStats } from "@/lib/stats";
import { asc, eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const currentRound = await getCurrentRound();

  // Gated server-side (see /api/bears) — empty matchups drops the page into
  // its "not ready yet" placeholder for non-admins until the bracket reveals.
  if (!session.user.isAdmin && !(await isBracketRevealed())) {
    return NextResponse.json({ currentRound, matchups: [], pickStats: {} });
  }
  const roundMatchups = await db.query.matchups.findMany({
    where: eq(matchups.round, currentRound),
    orderBy: [asc(matchups.position)],
  });

  const matchupIds = roundMatchups.map((m) => m.id);
  const [picks, allUsers] = await Promise.all([
    matchupIds.length > 0 ? db.query.userPicks.findMany({ where: inArray(userPicks.matchupId, matchupIds) }) : Promise.resolve([]),
    db.query.users.findMany(),
  ]);

  const playerIds = playerIdSet(allUsers);
  const playerPicks = picks.filter((p) => playerIds.has(p.userId));
  const pickStats = tallyPickStats(playerPicks);

  return NextResponse.json({ currentRound, matchups: roundMatchups, pickStats });
}
