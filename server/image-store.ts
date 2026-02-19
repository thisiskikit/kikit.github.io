import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.resolve(process.cwd(), "attached_assets", "uploads");

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const sanitizeFileName = (name: string) => {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
};

const ensureUploadDir = async () => {
  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
};

export type StoredImageInfo = {
  storedUrl: string;
  mime: string | null;
  size: number;
  originalName?: string | null;
};

export async function storeDataUrlImage(dataUrl: string, originalName?: string | null): Promise<StoredImageInfo> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid dataUrl format.");
  }

  const mime = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  const ext = MIME_EXT[mime] || "bin";
  const baseName = sanitizeFileName(originalName || `upload-${Date.now()}.${ext}`);
  const safeName = baseName.includes(".") ? baseName : `${baseName}.${ext}`;
  const unique = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safeName}`;
  const filePath = path.join(UPLOAD_DIR, unique);

  await ensureUploadDir();
  await fs.promises.writeFile(filePath, buffer);

  return {
    storedUrl: `/uploads/${unique}`,
    mime,
    size: buffer.length,
    originalName: originalName || null,
  };
}

export function storeRemoteImagePlaceholder(url: string): StoredImageInfo {
  return {
    storedUrl: url,
    mime: null,
    size: 0,
    originalName: null,
  };
}
