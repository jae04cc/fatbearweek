import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bears } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/adminGuard";
import { deleteUpload } from "@/lib/upload";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const { number, name, identification, bio, isBye, sortOrder } = body as {
      number?: string;
      name?: string;
      identification?: string | null;
      bio?: string | null;
      isBye?: boolean;
      sortOrder?: number;
    };

    const updates: Partial<typeof bears.$inferInsert> = {};
    if (number !== undefined) updates.number = number.trim();
    if (name !== undefined) updates.name = name.trim();
    if (identification !== undefined) updates.identification = identification?.trim() || null;
    if (bio !== undefined) updates.bio = bio?.trim() || null;
    if (isBye !== undefined) updates.isBye = isBye;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    await db.update(bears).set(updates).where(eq(bears.id, params.id));
    const updated = await db.query.bears.findFirst({ where: eq(bears.id, params.id) });
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update bear" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const bear = await db.query.bears.findFirst({ where: eq(bears.id, params.id) });
    if (!bear) return NextResponse.json({ error: "Bear not found" }, { status: 404 });

    await deleteUpload(bear.photoBeforeUrl);
    await deleteUpload(bear.photoAfterUrl);
    await db.delete(bears).where(eq(bears.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete bear" }, { status: 500 });
  }
}
