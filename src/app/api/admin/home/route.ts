import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { setSetting, type HomeContentBlock } from "@/lib/settings";

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { blocks, paymentInfo } = (await req.json()) as {
    blocks?: HomeContentBlock[];
    paymentInfo?: string;
  };

  // Both fields are independently optional so the payment note and the
  // announcement list can be saved on their own without clobbering each other.
  if (blocks !== undefined) await setSetting("home_content", JSON.stringify(blocks));
  if (paymentInfo !== undefined) await setSetting("payment_info", paymentInfo);

  return NextResponse.json({ ok: true });
}
