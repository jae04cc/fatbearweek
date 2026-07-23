import { NextResponse } from "next/server";
import { isBracketLocked, getCurrentRound, isBearsRevealed, isBracketRevealed } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const [bracketLocked, currentRound, bearsRevealed, bracketRevealed] = await Promise.all([
    isBracketLocked(),
    getCurrentRound(),
    isBearsRevealed(),
    isBracketRevealed(),
  ]);
  return NextResponse.json({ bracketLocked, currentRound, bearsRevealed, bracketRevealed });
}
