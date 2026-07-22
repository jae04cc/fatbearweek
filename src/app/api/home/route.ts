import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { getHomeContent, isBracketLocked } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [blocks, bracketLocked, allUsers, allMatchups, allPicks] = await Promise.all([
    getHomeContent(),
    isBracketLocked(),
    db.query.users.findMany(),
    db.query.matchups.findMany(),
    db.query.userPicks.findMany(),
  ]);

  // Only the bootstrap operator account is excluded — every other user
  // (including other admins) is a real player
  const players = allUsers.filter((u) => !u.isBootstrap);
  const paidCount = players.filter((u) => u.hasPaid).length;

  // A bracket only counts as "completed" once every matchup has a saved pick —
  // a partially-filled bracket doesn't count.
  const totalMatchups = allMatchups.length;
  const pickCountByUser = new Map<string, number>();
  for (const p of allPicks) {
    pickCountByUser.set(p.userId, (pickCountByUser.get(p.userId) ?? 0) + 1);
  }
  const completedCount =
    totalMatchups > 0 ? players.filter((u) => (pickCountByUser.get(u.id) ?? 0) === totalMatchups).length : 0;

  // $20/entry, split evenly between the winner pot and a donation — a fixed
  // per-season constant, not a setting, since this is a single-tournament
  // deployment (see V1 assumptions).
  const ENTRY_FEE = 20;
  const collected = paidCount * ENTRY_FEE;

  return NextResponse.json({
    blocks,
    bracketLocked,
    paid: { paid: paidCount, total: players.length },
    completed: { completed: completedCount, total: players.length },
    pot: { collected, winnerShare: collected / 2, donationShare: collected / 2 },
  });
}
