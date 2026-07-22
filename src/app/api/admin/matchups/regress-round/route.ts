import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { getCurrentRound, setSetting } from "@/lib/settings";

// Moves the "current round" pointer backward — an undo for an accidental
// advance. Doesn't touch any recorded winners; those are undone separately
// per-matchup via PATCH /api/admin/matchups/[id] with winnerBearId: null.
export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  const currentRound = await getCurrentRound();
  if (currentRound <= 1) {
    return NextResponse.json({ error: "Already at Round 1." }, { status: 409 });
  }

  const previousRound = currentRound - 1;
  await setSetting("current_round", String(previousRound));
  return NextResponse.json({ ok: true, currentRound: previousRound });
}
