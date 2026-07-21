import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bears } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/adminGuard";
import { saveUpload, deleteUpload } from "@/lib/upload";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const bear = await db.query.bears.findFirst({ where: eq(bears.id, params.id) });
    if (!bear) return NextResponse.json({ error: "Bear not found" }, { status: 404 });

    const formData = await req.formData();
    const slot = formData.get("slot");
    const file = formData.get("file");

    if ((slot !== "before" && slot !== "after") || !(file instanceof File)) {
      return NextResponse.json({ error: "Expected 'slot' (before/after) and 'file'" }, { status: 400 });
    }

    const servedUrl = await saveUpload(file, `${params.id}-${slot}`);

    const previousUrl = slot === "before" ? bear.photoBeforeUrl : bear.photoAfterUrl;
    await db
      .update(bears)
      .set(slot === "before" ? { photoBeforeUrl: servedUrl } : { photoAfterUrl: servedUrl })
      .where(eq(bears.id, params.id));
    await deleteUpload(previousUrl);

    return NextResponse.json({ url: servedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload photo";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
