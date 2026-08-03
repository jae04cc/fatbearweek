import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { postComments } from "@/lib/db/schema";
import { getHomeContent, getPaymentInfo, isBracketLocked } from "@/lib/settings";
import { count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [blocks, paymentInfo, bracketLocked, allUsers, commentCountRows] = await Promise.all([
    getHomeContent(),
    getPaymentInfo(),
    isBracketLocked(),
    db.query.users.findMany(),
    // Counts only — the comments themselves load lazily when a post is opened,
    // so the feed can show "3 comments" without fetching every thread up front.
    db.select({ blockId: postComments.blockId, total: count() }).from(postComments).groupBy(postComments.blockId),
  ]);

  const commentCounts: Record<string, number> = {};
  for (const row of commentCountRows) commentCounts[row.blockId] = row.total;

  // Only the bootstrap operator account is excluded — every other user
  // (including other admins) is a real player
  const players = allUsers.filter((u) => !u.isBootstrap);
  const paidCount = players.filter((u) => u.hasPaid).length;

  // $20/entry, split evenly between the winner pot and a donation — a fixed
  // per-season constant, not a setting, since this is a single-tournament
  // deployment (see V1 assumptions).
  const ENTRY_FEE = 20;
  const collected = paidCount * ENTRY_FEE;

  return NextResponse.json({
    blocks,
    commentCounts,
    paymentInfo,
    bracketLocked,
    paid: { paid: paidCount, total: players.length },
    pot: { collected, winnerShare: collected / 2, donationShare: collected / 2 },
  });
}
