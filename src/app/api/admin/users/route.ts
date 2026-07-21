import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/adminGuard";
import { hashPassword } from "@/lib/password";
import { generateId, normalizeDisplayName, isValidUsername, isValidDisplayName, isReservedUsername } from "@/lib/utils";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const rows = await db.query.users.findMany({ orderBy: [asc(users.username)] });
  return NextResponse.json(rows.map((u) => ({ ...u, passwordHash: undefined })));
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { username, password, displayName } = (await req.json()) as {
      username: string;
      password: string;
      displayName?: string;
    };

    if (!username?.trim() || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }
    if (!isValidUsername(username.trim())) {
      return NextResponse.json({ error: "Username can only contain letters and numbers." }, { status: 400 });
    }
    if (isReservedUsername(username)) {
      return NextResponse.json({ error: "That username is reserved." }, { status: 400 });
    }
    if (displayName?.trim() && !isValidDisplayName(displayName.trim())) {
      return NextResponse.json(
        { error: "Display name can only contain letters, numbers, and spaces." },
        { status: 400 }
      );
    }

    const id = generateId();
    // Stored lowercase so logins/lookups are case-insensitive
    const normalizedUsername = username.trim().toLowerCase();
    await db.insert(users).values({
      id,
      username: normalizedUsername,
      passwordHash: await hashPassword(password),
      displayName: normalizeDisplayName(displayName, normalizedUsername),
      isAdmin: false,
      hasPaid: false,
      createdAt: new Date(),
    });

    const created = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, id) });
    return NextResponse.json({ ...created, passwordHash: undefined }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create user (username may already be in use)" }, { status: 500 });
  }
}
