import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { postComments } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/adminGuard";
import { getHomeContent, setSetting, type HomeContentBlock } from "@/lib/settings";
import { notInArray } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { blocks, paymentInfo } = (await req.json()) as {
    blocks?: HomeContentBlock[];
    paymentInfo?: string;
  };

  // Both fields are independently optional so the payment note and the
  // announcement list can be saved on their own without clobbering each other.
  if (blocks !== undefined) {
    const previous = await getHomeContent();
    await setSetting("home_content", JSON.stringify(blocks));

    // Comments key off a block id that isn't a foreign key (blocks live in a
    // JSON setting, not a table), so nothing cascades on its own — sweep up
    // any thread whose post just went away. Only runs when a post actually
    // disappeared, so an ordinary edit never touches the comments table.
    const survivingIds = blocks.map((b) => b.id);
    const removedAny = previous.some((b) => !survivingIds.includes(b.id));
    if (removedAny) {
      // notInArray against an empty list isn't valid SQL — when every post is
      // gone, every comment is orphaned, so clear the table outright.
      if (survivingIds.length === 0) {
        await db.delete(postComments);
      } else {
        await db.delete(postComments).where(notInArray(postComments.blockId, survivingIds));
      }
    }
  }

  if (paymentInfo !== undefined) await setSetting("payment_info", paymentInfo);

  return NextResponse.json({ ok: true });
}
