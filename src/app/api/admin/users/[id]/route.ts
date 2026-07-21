import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/adminGuard";
import { hashPassword } from "@/lib/password";
import { normalizeDisplayName, isValidDisplayName } from "@/lib/utils";
import { eq } from "drizzle-orm";

async function countAdmins() {
  const all = await db.query.users.findMany();
  return all.filter((u) => u.isAdmin).length;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = (await req.json()) as {
      isAdmin?: boolean;
      hasPaid?: boolean;
      displayName?: string;
      password?: string;
    };

    const user = await db.query.users.findFirst({ where: eq(users.id, params.id) });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (body.displayName?.trim() && !isValidDisplayName(body.displayName.trim())) {
      return NextResponse.json(
        { error: "Display name can only contain letters, numbers, and spaces." },
        { status: 400 }
      );
    }

    if (body.isAdmin === false && user.isAdmin) {
      const adminCount = await countAdmins();
      if (adminCount === 1) {
        return NextResponse.json({ error: "Cannot demote the last admin." }, { status: 409 });
      }
    }

    const updates: Partial<typeof users.$inferInsert> = {};
    if (body.isAdmin !== undefined) updates.isAdmin = body.isAdmin;
    if (body.hasPaid !== undefined) updates.hasPaid = body.hasPaid;
    if (body.displayName !== undefined) updates.displayName = normalizeDisplayName(body.displayName, user.username);
    if (body.password) updates.passwordHash = await hashPassword(body.password);

    await db.update(users).set(updates).where(eq(users.id, params.id));
    const updated = await db.query.users.findFirst({ where: eq(users.id, params.id) });
    return NextResponse.json({ ...updated, passwordHash: undefined });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const user = await db.query.users.findFirst({ where: eq(users.id, params.id) });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.isAdmin) {
    const adminCount = await countAdmins();
    if (adminCount === 1) {
      return NextResponse.json({ error: "Cannot delete the last admin." }, { status: 409 });
    }
  }

  await db.delete(users).where(eq(users.id, params.id));
  return NextResponse.json({ ok: true });
}
