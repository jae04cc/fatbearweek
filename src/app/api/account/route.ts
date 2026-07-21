import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth } from "@/auth";
import { hashPassword } from "@/lib/password";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { displayName, password } = (await req.json()) as {
      displayName?: string;
      password?: string;
    };

    const updates: Partial<typeof users.$inferInsert> = {};
    if (displayName !== undefined) updates.displayName = displayName.trim() || null;
    if (password) {
      if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }
      updates.passwordHash = await hashPassword(password);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    await db.update(users).set(updates).where(eq(users.id, session.user.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}
