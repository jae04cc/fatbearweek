import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bears } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";
import { requireAdmin } from "@/lib/adminGuard";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const rows = await db.query.bears.findMany({ orderBy: [asc(bears.sortOrder)] });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const { number, name, bio, isBye, sortOrder } = body as {
      number: string;
      name: string;
      bio?: string;
      isBye?: boolean;
      sortOrder?: number;
    };

    if (!number?.trim() || !name?.trim()) {
      return NextResponse.json({ error: "Number and name are required" }, { status: 400 });
    }

    const id = generateId();
    await db.insert(bears).values({
      id,
      number: number.trim(),
      name: name.trim(),
      bio: bio?.trim() || null,
      isBye: isBye ?? false,
      sortOrder: sortOrder ?? 0,
      createdAt: new Date(),
    });

    const created = await db.query.bears.findFirst({ where: (b, { eq }) => eq(b.id, id) });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create bear (number may already be in use)" }, { status: 500 });
  }
}
