import path from "path";
import fs from "fs/promises";
import { randomBytes } from "crypto";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "data", "uploads");

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function saveUpload(file: File, prefix: string): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error("Unsupported image type. Use JPEG, PNG, or WebP.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is too large (max 8MB).");
  }

  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const hash = randomBytes(6).toString("hex");
  const filename = `${prefix}-${hash}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer);

  return `/uploads/${filename}`;
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
};

export function contentTypeForFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}
