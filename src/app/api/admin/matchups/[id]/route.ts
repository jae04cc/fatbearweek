import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matchups } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/adminGuard";
import { eq, or } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { winnerBearId } = (await req.json()) as { winnerBearId: string | null };

    const matchup = await db.query.matchups.findFirst({ where: eq(matchups.id, params.id) });
    if (!matchup) return NextResponse.json({ error: "Matchup not found" }, { status: 404 });

    const downstream = await db.query.matchups.findFirst({
      where: or(eq(matchups.feederMatchupAId, params.id), eq(matchups.feederMatchupBId, params.id)),
    });

    if (winnerBearId === null) {
      if (downstream?.winnerBearId) {
        return NextResponse.json(
          { error: "Can't unmark — the next round already has a recorded winner built on this result." },
          { status: 409 }
        );
      }
      await db.update(matchups).set({ winnerBearId: null, decidedAt: null }).where(eq(matchups.id, params.id));
      if (downstream) {
        const isA = downstream.feederMatchupAId === params.id;
        await db
          .update(matchups)
          .set(isA ? { bearAId: null } : { bearBId: null })
          .where(eq(matchups.id, downstream.id));
      }
      return NextResponse.json({ ok: true });
    }

    if (winnerBearId !== matchup.bearAId && winnerBearId !== matchup.bearBId) {
      return NextResponse.json({ error: "Winner must be one of the two contestants" }, { status: 400 });
    }

    await db.update(matchups).set({ winnerBearId, decidedAt: new Date() }).where(eq(matchups.id, params.id));

    if (downstream) {
      const isA = downstream.feederMatchupAId === params.id;
      await db
        .update(matchups)
        .set(isA ? { bearAId: winnerBearId } : { bearBId: winnerBearId })
        .where(eq(matchups.id, downstream.id));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update matchup" }, { status: 500 });
  }
}
