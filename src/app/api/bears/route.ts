import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bears } from "@/lib/db/schema";
import { auth } from "@/auth";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.query.bears.findMany({ orderBy: [asc(bears.sortOrder)] });
  return NextResponse.json(rows);
}
