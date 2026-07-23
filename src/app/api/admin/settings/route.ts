import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { isBracketLocked, getSignupCode, isBearsRevealed, isBracketRevealed, setSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [bracketLocked, signupCode, bearsRevealed, bracketRevealed] = await Promise.all([
    isBracketLocked(),
    getSignupCode(),
    isBearsRevealed(),
    isBracketRevealed(),
  ]);
  return NextResponse.json({ bracketLocked, signupCode, bearsRevealed, bracketRevealed });
}

export async function PUT(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { bracketLocked, signupCode, bearsRevealed, bracketRevealed } = (await req.json()) as {
    bracketLocked?: boolean;
    signupCode?: string;
    bearsRevealed?: boolean;
    bracketRevealed?: boolean;
  };

  if (bracketLocked !== undefined) {
    await setSetting("bracket_locked", bracketLocked ? "true" : "false");
  }
  if (signupCode !== undefined) {
    await setSetting("signup_code", signupCode.trim());
  }

  // The bracket reveal depends on bears being revealed first — showing the
  // bracket (which is full of bear names/photos) without the roster itself
  // being visible wouldn't make sense.
  if (bearsRevealed !== undefined || bracketRevealed !== undefined) {
    const effectiveBearsRevealed = bearsRevealed ?? (await isBearsRevealed());

    if (bracketRevealed === true && !effectiveBearsRevealed) {
      return NextResponse.json({ error: "Reveal bears before revealing the bracket." }, { status: 409 });
    }

    if (bearsRevealed !== undefined) {
      await setSetting("reveal_bears", bearsRevealed ? "true" : "false");
      // Turning bears back off pulls the bracket down with it, so the
      // dependency can never be left in an inconsistent state.
      if (!bearsRevealed) {
        await setSetting("reveal_bracket", "false");
      }
    }
    if (bracketRevealed !== undefined) {
      await setSetting("reveal_bracket", bracketRevealed ? "true" : "false");
    }
  }

  return NextResponse.json({ ok: true });
}
