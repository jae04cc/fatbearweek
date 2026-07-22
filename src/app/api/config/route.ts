import { NextResponse } from "next/server";
import { isBracketLocked, getCurrentRound, isRevealedToPlayers } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const [bracketLocked, currentRound, revealedToPlayers] = await Promise.all([
    isBracketLocked(),
    getCurrentRound(),
    isRevealedToPlayers(),
  ]);
  return NextResponse.json({ bracketLocked, currentRound, revealedToPlayers });
}
