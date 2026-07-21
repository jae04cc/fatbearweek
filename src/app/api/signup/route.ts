import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSignupCode } from "@/lib/settings";
import { hashPassword } from "@/lib/password";
import { generateId } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { username, password, displayName, code } = (await req.json()) as {
      username?: string;
      password?: string;
      displayName?: string;
      code?: string;
    };

    const requiredCode = await getSignupCode();
    if (!requiredCode) {
      return NextResponse.json({ error: "Sign-up isn't open right now." }, { status: 403 });
    }
    if (!code || code.trim() !== requiredCode) {
      return NextResponse.json({ error: "Invalid invite code." }, { status: 403 });
    }

    if (!username?.trim() || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const existing = await db.query.users.findFirst({ where: eq(users.username, normalizedUsername) });
    if (existing) {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }

    const id = generateId();
    await db.insert(users).values({
      id,
      username: normalizedUsername,
      passwordHash: await hashPassword(password),
      displayName: displayName?.trim() || null,
      isAdmin: false,
      isBootstrap: false,
      hasPaid: false,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
