import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isBracketLocked, getCurrentRound, isBearsRevealed, isBracketRevealed } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [bracketLocked, currentRound, bearsRevealed, bracketRevealed] = await Promise.all([
    isBracketLocked(),
    getCurrentRound(),
    isBearsRevealed(),
    isBracketRevealed(),
  ]);
  return NextResponse.json({ bracketLocked, currentRound, bearsRevealed, bracketRevealed });
}
