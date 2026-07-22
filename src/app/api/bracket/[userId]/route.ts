import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userPicks, users } from "@/lib/db/schema";
import { auth } from "@/auth";
import { isBracketLocked } from "@/lib/settings";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Anyone can view anyone else's bracket, but ONLY once the bracket is
// locked — brackets are secret from other players until then, matching the
// personal /api/bracket route's own lock rule for edits.
export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await isBracketLocked())) {
    return NextResponse.json({ error: "Brackets are secret until the pool is locked." }, { status: 403 });
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, params.userId) });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [allMatchups, theirPicks] = await Promise.all([
    db.query.matchups.findMany(),
    db.query.userPicks.findMany({ where: eq(userPicks.userId, params.userId) }),
  ]);

  const picksByMatchupId = Object.fromEntries(theirPicks.map((p) => [p.matchupId, p.pickedBearId]));

  return NextResponse.json({
    displayName: user.displayName ?? user.username,
    matchups: allMatchups,
    picks: picksByMatchupId,
  });
}
