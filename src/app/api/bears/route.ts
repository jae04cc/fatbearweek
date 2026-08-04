import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bears } from "@/lib/db/schema";
import { auth } from "@/auth";
import { isBearsRevealed } from "@/lib/settings";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // The reveal gate is enforced here, not just in the UI — otherwise the full
  // roster ships to the browser and is one devtools/curl away regardless of
  // what the page renders. Admins always see it so they can set it up.
  if (!session.user.isAdmin && !(await isBearsRevealed())) {
    return NextResponse.json([]);
  }

  const rows = await db.query.bears.findMany({ orderBy: [asc(bears.sortOrder)] });
  return NextResponse.json(rows);
}
