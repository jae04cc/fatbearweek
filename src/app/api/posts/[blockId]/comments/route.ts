import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/adminGuard";
import { postComments, users } from "@/lib/db/schema";
import { generateId, normalizeDisplayName } from "@/lib/utils";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Long enough for a real reply, short enough that nobody pastes an essay into
// a card that has to stay readable inline.
const MAX_BODY_LENGTH = 1000;

export async function GET(_req: NextRequest, { params }: { params: { blockId: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const rows = await db
    .select({
      id: postComments.id,
      userId: postComments.userId,
      body: postComments.body,
      createdAt: postComments.createdAt,
      displayName: users.displayName,
      username: users.username,
    })
    .from(postComments)
    .innerJoin(users, eq(postComments.userId, users.id))
    .where(eq(postComments.blockId, params.blockId))
    .orderBy(asc(postComments.createdAt));

  return NextResponse.json({
    comments: rows.map(({ displayName, username, ...rest }) => ({
      ...rest,
      displayName: normalizeDisplayName(displayName, username),
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: { blockId: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  let parsed: { body?: string };
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const trimmed = parsed.body?.trim() ?? "";
  if (!trimmed) return NextResponse.json({ error: "Comment can't be empty." }, { status: 400 });
  if (trimmed.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: `Keep it under ${MAX_BODY_LENGTH} characters.` }, { status: 400 });
  }

  const comment = {
    id: generateId(),
    blockId: params.blockId,
    userId: session.user.id,
    body: trimmed,
    createdAt: new Date(),
  };
  await db.insert(postComments).values(comment);

  return NextResponse.json({ ...comment, displayName: session.user.displayName ?? "" }, { status: 201 });
}
