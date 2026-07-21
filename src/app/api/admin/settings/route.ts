import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { isBracketLocked, getSignupCode, setSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [bracketLocked, signupCode] = await Promise.all([isBracketLocked(), getSignupCode()]);
  return NextResponse.json({ bracketLocked, signupCode });
}

export async function PUT(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { bracketLocked, signupCode } = (await req.json()) as {
    bracketLocked?: boolean;
    signupCode?: string;
  };

  if (bracketLocked !== undefined) {
    await setSetting("bracket_locked", bracketLocked ? "true" : "false");
  }
  if (signupCode !== undefined) {
    await setSetting("signup_code", signupCode.trim());
  }

  return NextResponse.json({ ok: true });
}
