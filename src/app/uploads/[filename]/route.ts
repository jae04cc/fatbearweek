import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { resolveUploadPath, contentTypeForFilename } from "@/lib/upload";

const SAFE_FILENAME = /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/;

export async function GET(_req: NextRequest, { params }: { params: { filename: string } }) {
  if (!SAFE_FILENAME.test(params.filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await fs.readFile(resolveUploadPath(params.filename));
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentTypeForFilename(params.filename),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
