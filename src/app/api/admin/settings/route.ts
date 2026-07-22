import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { isBracketLocked, getSignupCode, isRevealedToPlayers, setSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [bracketLocked, signupCode, revealedToPlayers] = await Promise.all([
    isBracketLocked(),
    getSignupCode(),
    isRevealedToPlayers(),
  ]);
  return NextResponse.json({ bracketLocked, signupCode, revealedToPlayers });
}

export async function PUT(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { bracketLocked, signupCode, revealedToPlayers } = (await req.json()) as {
    bracketLocked?: boolean;
    signupCode?: string;
    revealedToPlayers?: boolean;
  };

  if (bracketLocked !== undefined) {
    await setSetting("bracket_locked", bracketLocked ? "true" : "false");
  }
  if (signupCode !== undefined) {
    await setSetting("signup_code", signupCode.trim());
  }
  if (revealedToPlayers !== undefined) {
    await setSetting("reveal_to_players", revealedToPlayers ? "true" : "false");
  }

  return NextResponse.json({ ok: true });
}
