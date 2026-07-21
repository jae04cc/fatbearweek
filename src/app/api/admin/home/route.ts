import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { setSetting, type HomeContentBlock } from "@/lib/settings";

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { blocks } = (await req.json()) as { blocks: HomeContentBlock[] };
  await setSetting("home_content", JSON.stringify(blocks ?? []));
  return NextResponse.json({ ok: true });
}
