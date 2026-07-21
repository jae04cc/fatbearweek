import { NextResponse } from "next/server";
import { isBracketLocked, getCurrentRound } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const [bracketLocked, currentRound] = await Promise.all([isBracketLocked(), getCurrentRound()]);
  return NextResponse.json({ bracketLocked, currentRound });
}
