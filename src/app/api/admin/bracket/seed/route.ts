import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matchups } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/adminGuard";
import { buildBracketTopology, type BracketAssignment } from "@/lib/bracket/topology";
import { generateId } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const force = new URL(req.url).searchParams.get("force") === "true";

  try {
    const existing = await db.query.matchups.findMany();
    const anyDecided = existing.some((m) => m.winnerBearId);
    if (anyDecided && !force) {
      return NextResponse.json(
        { error: "Some matchups already have a recorded winner. Pass ?force=true to reseed anyway (this discards those results)." },
        { status: 409 }
      );
    }

    const assignment = (await req.json()) as BracketAssignment;

    // Cross-check the submitted bear ids against the roster's isBye flags —
    // the assignment itself only knows ids, not which bears are byes.
    const allBears = await db.query.bears.findMany();
    const bearById = new Map(allBears.map((b) => [b.id, b]));

    for (const m of assignment.round1 ?? []) {
      for (const bearId of [m.bearAId, m.bearBId]) {
        const bear = bearById.get(bearId);
        if (!bear) return NextResponse.json({ error: "One of the Round 1 bears no longer exists." }, { status: 400 });
        if (bear.isBye) return NextResponse.json({ error: `${bear.name} has a bye and can't be placed in Round 1.` }, { status: 400 });
      }
    }
    for (const b of assignment.round2Byes ?? []) {
      const bear = bearById.get(b.bearId);
      if (!bear) return NextResponse.json({ error: "One of the bye bears no longer exists." }, { status: 400 });
      if (!bear.isBye) return NextResponse.json({ error: `${bear.name} isn't marked as a bye bear.` }, { status: 400 });
    }

    const topology = buildBracketTopology(assignment);

    // Wipe existing matchups (cascades user_picks) before reseeding
    if (existing.length > 0) {
      await db.delete(matchups);
    }

    // Pass 1: insert every matchup with its fixed bear slots, no feeder pointers yet
    const idByRoundPosition = new Map<string, string>();
    const rows = topology.map((slot) => {
      const id = generateId();
      idByRoundPosition.set(`${slot.round}:${slot.position}`, id);
      return {
        id,
        round: slot.round,
        position: slot.position,
        bearAId: slot.bearAId ?? null,
        bearBId: slot.bearBId ?? null,
      };
    });
    await db.insert(matchups).values(rows);

    // Pass 2: wire up feeder pointers now that every matchup has an id
    for (const slot of topology) {
      const id = idByRoundPosition.get(`${slot.round}:${slot.position}`)!;
      const feederMatchupAId = slot.feederA ? idByRoundPosition.get(`${slot.feederA.round}:${slot.feederA.position}`) : undefined;
      const feederMatchupBId = slot.feederB ? idByRoundPosition.get(`${slot.feederB.round}:${slot.feederB.position}`) : undefined;
      if (feederMatchupAId || feederMatchupBId) {
        await db
          .update(matchups)
          .set({
            ...(feederMatchupAId ? { feederMatchupAId } : {}),
            ...(feederMatchupBId ? { feederMatchupBId } : {}),
          })
          .where(eq(matchups.id, id));
      }
    }

    const seeded = await db.query.matchups.findMany();
    return NextResponse.json({ ok: true, matchups: seeded });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to seed bracket";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
