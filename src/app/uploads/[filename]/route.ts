import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { requireAuth } from "@/lib/adminGuard";
import { resolveUploadPath, contentTypeForFilename } from "@/lib/upload";

const SAFE_FILENAME = /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/;

export async function GET(_req: NextRequest, { params }: { params: { filename: string } }) {
  // Uploaded bear/announcement photos are pool content — behind login like
  // everything else. Browsers send the session cookie with <img> requests, so
  // this is transparent to logged-in users and blocks anonymous hot-linking.
  const { error } = await requireAuth();
  if (error) return error;

  if (!SAFE_FILENAME.test(params.filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await fs.readFile(resolveUploadPath(params.filename));
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentTypeForFilename(params.filename),
        // Filenames already carry a random hash and never change content, so
        // they're safe to cache hard — but `private`, since access is now
        // gated on the viewer's session rather than public.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
