import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matchups } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/adminGuard";
import { getCurrentRound, setSetting } from "@/lib/settings";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const force = new URL(req.url).searchParams.get("force") === "true";
  const currentRound = await getCurrentRound();

  if (currentRound >= 4) {
    return NextResponse.json({ error: "The bracket is already at the championship round." }, { status: 409 });
  }

  const roundMatchups = await db.query.matchups.findMany({ where: eq(matchups.round, currentRound) });
  const allDecided = roundMatchups.length > 0 && roundMatchups.every((m) => m.winnerBearId);

  if (!allDecided && !force) {
    return NextResponse.json(
      { error: "Not every matchup in the current round has a recorded winner yet." },
      { status: 409 }
    );
  }

  const nextRound = currentRound + 1;
  await setSetting("current_round", String(nextRound));
  return NextResponse.json({ ok: true, currentRound: nextRound });
}
