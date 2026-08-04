import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/adminGuard";
import { postComments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const comment = await db.query.postComments.findFirst({ where: eq(postComments.id, params.id) });
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  // You can always delete your own; admins can delete anyone's. Checked here,
  // not just hidden in the UI — this is the trust boundary.
  const isOwner = comment.userId === session.user.id;
  if (!isOwner && !session.user.isAdmin) {
    return NextResponse.json({ error: "You can only delete your own comments." }, { status: 403 });
  }

  await db.delete(postComments).where(eq(postComments.id, params.id));
  return NextResponse.json({ ok: true });
}
