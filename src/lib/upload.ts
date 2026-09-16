import path from "path";
import fs from "fs/promises";
import { randomBytes } from "crypto";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "data", "uploads");

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function saveUpload(file: File, prefix: string): Promise<string> {
  const originalExt = ALLOWED_TYPES[file.type];
  if (!originalExt) {
    throw new Error("Unsupported image type. Use JPEG, PNG, GIF, or WebP.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is too large (max 10MB).");
  }

  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const hash = randomBytes(6).toString("hex");
  const inputBuffer = Buffer.from(await file.arrayBuffer());

  // Convert everything to WebP on the way in — much smaller than GIF/PNG/JPEG,
  // animation preserved, forced to loop forever. Falls back to the original
  // bytes if conversion isn't possible, so an upload never hard-fails.
  const converted = await convertToWebp(inputBuffer, file.type);
  const ext = converted ? "webp" : originalExt;
  const buffer = converted ?? inputBuffer;

  const filename = `${prefix}-${hash}.${ext}`;
  await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer);

  return `/uploads/${filename}`;
}

// Re-encodes an uploaded image to WebP. Returns the WebP bytes, or null when
// conversion isn't available/possible so the caller can store the original.
async function convertToWebp(input: Buffer, mimeType: string): Promise<Buffer | null> {
  try {
    // Lazy-loaded so a missing or broken native binary degrades to storing the
    // original file instead of crashing the whole upload route.
    const sharp = (await import("sharp")).default;
    // `animated: true` keeps every frame of an animated GIF/WebP; `loop: 0`
    // makes the output loop forever regardless of the source's loop flag.
    const output = await sharp(input, { animated: true })
      .webp({ quality: 82, effort: 4, loop: 0 })
      .toBuffer();
    console.log(`[upload] converted ${mimeType} to webp: ${input.length} -> ${output.length} bytes`);
    return output;
  } catch (err) {
    console.error(`[upload] webp conversion failed for ${mimeType}, storing original:`, err);
    return null;
  }
}

export async function deleteUpload(servedUrl: string | null | undefined): Promise<void> {
  if (!servedUrl || !servedUrl.startsWith("/uploads/")) return;
  const filename = servedUrl.replace("/uploads/", "");
  await fs.unlink(path.join(UPLOADS_DIR, filename)).catch(() => {});
}

export function resolveUploadPath(filename: string): string {
  return path.join(UPLOADS_DIR, filename);
}

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export function contentTypeForFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}
