import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth } from "@/auth";
import { hashPassword } from "@/lib/password";
import { normalizeDisplayName, isValidDisplayName } from "@/lib/utils";
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

    if (displayName?.trim() && !isValidDisplayName(displayName.trim())) {
      return NextResponse.json(
        { error: "Display name can only contain letters, numbers, and spaces." },
        { status: 400 }
      );
    }

    const updates: Partial<typeof users.$inferInsert> = {};
    if (displayName !== undefined) {
      const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      updates.displayName = normalizeDisplayName(displayName, user.username);
    }
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
