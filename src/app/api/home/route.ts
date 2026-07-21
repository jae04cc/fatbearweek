import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { getHomeContent, isBracketLocked } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [blocks, bracketLocked, allUsers] = await Promise.all([
    getHomeContent(),
    isBracketLocked(),
    db.query.users.findMany(),
  ]);

  // Only the bootstrap operator account is excluded — every other user
  // (including other admins) is a real player
  const players = allUsers.filter((u) => !u.isBootstrap);
  const paidCount = players.filter((u) => u.hasPaid).length;

  return NextResponse.json({
    blocks,
    bracketLocked,
    paid: { paid: paidCount, total: players.length },
  });
}
