import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userPicks } from "@/lib/db/schema";
import { requireAuth } from "@/lib/adminGuard";
import { isBracketLocked, isBracketRevealed } from "@/lib/settings";
import { resolveContestants } from "@/lib/bracket/topology";
import { generateId } from "@/lib/utils";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [allMatchups, myPicks, bracketLocked, bracketRevealed] = await Promise.all([
    db.query.matchups.findMany(),
    db.query.userPicks.findMany({ where: eq(userPicks.userId, session.user.id) }),
    isBracketLocked(),
    isBracketRevealed(),
  ]);

  // Gated server-side (see /api/bears) — empty matchups keeps the fill page in
  // its placeholder state so a non-admin can't fetch the bracket shape early.
  if (!session.user.isAdmin && !bracketRevealed) {
    return NextResponse.json({ bracketLocked, matchups: [], picks: {} });
  }

  const picksByMatchupId = Object.fromEntries(myPicks.map((p) => [p.matchupId, p.pickedBearId]));

  // Send the raw bracket shape (including feeder pointers), not a pre-resolved
  // view — the client re-derives contestants locally with resolveContestants
  // so picks cascade instantly as the user taps, without a round-trip.
  return NextResponse.json({ bracketLocked, matchups: allMatchups, picks: picksByMatchupId });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (await isBracketLocked()) {
    return NextResponse.json({ error: "The bracket is locked — picks can no longer be changed." }, { status: 423 });
  }

  try {
    const body = await req.json();
    const submitted = (body.picks ?? {}) as Record<string, string>;

    const allMatchups = await db.query.matchups.findMany();
    const resolved = resolveContestants(allMatchups, submitted);
    const resolvedById = new Map(resolved.map((r) => [r.id, r]));

    for (const [matchupId, pickedBearId] of Object.entries(submitted)) {
      const r = resolvedById.get(matchupId);
      if (!r || (pickedBearId !== r.bearAId && pickedBearId !== r.bearBId)) {
        return NextResponse.json(
          { error: "One of your selections is no longer a legal contestant for that matchup." },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    const entries = Object.entries(submitted);

    // Delete-then-insert must be atomic: without a transaction, a crash between
    // the two statements would leave the bracket wiped with nothing written
    // back. The transaction makes it all-or-nothing.
    await db.transaction(async (tx) => {
      await tx.delete(userPicks).where(eq(userPicks.userId, session.user.id));
      if (entries.length > 0) {
        await tx.insert(userPicks).values(
          entries.map(([matchupId, pickedBearId]) => ({
            id: generateId(),
            userId: session.user.id,
            matchupId,
            pickedBearId,
            updatedAt: now,
          }))
        );
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save your bracket" }, { status: 500 });
  }
}
