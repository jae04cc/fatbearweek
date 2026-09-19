import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bears } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/adminGuard";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Rewrites the whole roster's sort order in one shot: the client sends the
// bear ids in the order it wants them, and every bear is renumbered 0..n-1.
//
// Renumbering everything rather than nudging one bear's number is what keeps
// the order well-defined — sortOrder has no uniqueness constraint, and two
// bears sharing a value sort against each other arbitrarily, so a roster that
// drifted into ties would otherwise reshuffle itself between page loads.
export async function PUT(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { ids } = (await req.json()) as { ids?: unknown };

    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
      return NextResponse.json({ error: "Expected an array of bear ids" }, { status: 400 });
    }

    // The order has to be a permutation of the current roster. A partial list
    // would leave the bears it omits holding stale numbers that collide with
    // the ones being assigned here.
    const existing = await db.query.bears.findMany({ orderBy: [asc(bears.sortOrder)] });
    const existingIds = new Set(existing.map((b) => b.id));
    const submitted = new Set(ids as string[]);
    if (submitted.size !== ids.length || submitted.size !== existingIds.size || !existing.every((b) => submitted.has(b.id))) {
      return NextResponse.json({ error: "The order must list every bear exactly once" }, { status: 400 });
    }

    // batch(), not transaction() — see the note in lib/db/index.ts: libSQL
    // drops its cached connection inside transaction(), resetting the
    // per-connection PRAGMAs. batch() is equally atomic and keeps them.
    if (ids.length > 0) {
      const statements = (ids as string[]).map((id, index) =>
        db.update(bears).set({ sortOrder: index }).where(eq(bears.id, id))
      );
      // batch() is typed as a non-empty tuple; the length check above is what
      // actually guarantees that.
      await db.batch(statements as [(typeof statements)[number], ...typeof statements]);
    }

    const reordered = await db.query.bears.findMany({ orderBy: [asc(bears.sortOrder)] });
    return NextResponse.json(reordered);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to reorder bears" }, { status: 500 });
  }
}
