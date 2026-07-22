import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bears, matchups } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/adminGuard";
import { deleteUpload } from "@/lib/upload";

// Wipes the entire roster and bracket for a new season — every bear (and its
// uploaded photos), every matchup, and (via cascade) every user's picks.
// Matchups reference bears with no cascade of their own, so they must be
// deleted first; deleting them cascades user_picks per the schema.
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { confirm } = (await req.json().catch(() => ({}))) as { confirm?: boolean };
  if (!confirm) {
    return NextResponse.json(
      { error: "Pass { confirm: true } to reset the bracket and roster for a new season." },
      { status: 400 }
    );
  }

  try {
    const allBears = await db.query.bears.findMany();

    await db.delete(matchups);

    for (const bear of allBears) {
      await deleteUpload(bear.photoBeforeUrl);
      await deleteUpload(bear.photoAfterUrl);
    }
    await db.delete(bears);

    return NextResponse.json({ ok: true, bearsDeleted: allBears.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to reset the bracket and roster" }, { status: 500 });
  }
}
