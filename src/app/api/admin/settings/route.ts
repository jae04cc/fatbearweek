import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { isBracketLocked, setSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  return NextResponse.json({ bracketLocked: await isBracketLocked() });
}

export async function PUT(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { bracketLocked } = (await req.json()) as { bracketLocked: boolean };
  await setSetting("bracket_locked", bracketLocked ? "true" : "false");
  return NextResponse.json({ ok: true, bracketLocked });
}
