import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { recordSecurityEvent } from "@/lib/security-events";
import { resolvePublicUploadPath } from "@/lib/upload-path";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 6000;
const MAX_IMAGE_HEIGHT = 6000;
const MAX_IMAGE_PIXELS = 24_000_000;

function getExtension(type: string) {
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  return ".jpg";
}

function buildDataUrl(type: string, bytes: Buffer) {
  return `data:${type};base64,${bytes.toString("base64")}`;
}

function shouldInlineUpload() {
  return (
    process.env.EVENTRO_INLINE_UPLOADS === "1" ||
    process.env.VERCEL === "1" ||
    process.env.RAILWAY_ENVIRONMENT_NAME != null ||
    process.env.RAILWAY_PROJECT_ID != null ||
    process.env.NODE_ENV === "production"
  );
}

function sanitizeFolder(folder: string) {
  const normalized = folder.trim().toLowerCase().replaceAll("\\", "/");

  if (!normalized || normalized.includes("..")) {
    throw new Error("Carpeta de subida no válida.");
  }

  const cleaned = normalized
    .split("/")
    .map((part) => part.replace(/[^a-z0-9-_]/g, ""))
    .filter(Boolean)
    .join("/");

  if (!cleaned) {
    throw new Error("Carpeta de subida no válida.");
  }

  return cleaned;
}

function hasValidImageSignature(type: string, bytes: Buffer) {
  if (type === "image/png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }

  if (type === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  if (type === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  }

  return false;
}

function parsePngDimensions(bytes: Buffer) {
  if (bytes.length < 24) return null;
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function parseJpegDimensions(bytes: Buffer) {
  let offset = 2;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);

    if (length < 2) {
      return null;
    }

    const isStartOfFrame =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf;

    if (isStartOfFrame && offset + 8 < bytes.length) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  return null;
}

function parseWebpDimensions(bytes: Buffer) {
  if (bytes.length < 20) return null;

  let chunkOffset = 12;

  while (chunkOffset + 8 <= bytes.length) {
    const chunkType = bytes.subarray(chunkOffset, chunkOffset + 4).toString("ascii");
    const chunkSize = bytes.readUInt32LE(chunkOffset + 4);
    const dataOffset = chunkOffset + 8;

    if (chunkType === "VP8X" && dataOffset + 10 <= bytes.length) {
      return {
        width: 1 + bytes[dataOffset + 4] + (bytes[dataOffset + 5] << 8) + (bytes[dataOffset + 6] << 16),
        height: 1 + bytes[dataOffset + 7] + (bytes[dataOffset + 8] << 8) + (bytes[dataOffset + 9] << 16),
      };
    }

    if (chunkType === "VP8 " && dataOffset + 10 <= bytes.length) {
      return {
        width: bytes.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: bytes.readUInt16LE(dataOffset + 8) & 0x3fff,
      };
    }

    if (chunkType === "VP8L" && dataOffset + 5 <= bytes.length) {
      const bits = bytes.readUInt32LE(dataOffset + 1);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }

    const nextChunkOffset = dataOffset + chunkSize + (chunkSize % 2);
    if (nextChunkOffset <= chunkOffset) {
      break;
    }

    chunkOffset = nextChunkOffset;
  }

  return null;
}

function getImageDimensions(type: string, bytes: Buffer) {
  if (type === "image/png") return parsePngDimensions(bytes);
  if (type === "image/jpeg") return parseJpegDimensions(bytes);
  if (type === "image/webp") return parseWebpDimensions(bytes);
  return null;
}

async function rejectUpload(reason: string, details: Record<string, unknown>) {
  await recordSecurityEvent({
    type: "upload_rejected",
    level: "WARN",
    message: reason,
    metadata: details,
  });
  throw new Error(reason);
}

export async function savePublicImage(file: File, folder: string) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    await rejectUpload("Formato de imagen no permitido.", {
      type: file.type,
      size: file.size,
      folder,
      reason: "invalid_mime",
    });
  }

  if (file.size <= 0) {
    await rejectUpload("La imagen está vacía.", {
      type: file.type,
      size: file.size,
      folder,
      reason: "empty_file",
    });
  }

  if (file.size > MAX_IMAGE_SIZE) {
    await rejectUpload("La imagen supera el límite de 5 MB.", {
      type: file.type,
      size: file.size,
      folder,
      reason: "size_limit",
    });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  if (!hasValidImageSignature(file.type, bytes)) {
    await rejectUpload("El archivo no es una imagen válida.", {
      type: file.type,
      size: file.size,
      folder,
      reason: "invalid_signature",
    });
  }

  const dimensions = getImageDimensions(file.type, bytes);

  if (!dimensions) {
    await rejectUpload("No se ha podido validar el tamaño real de la imagen.", {
      type: file.type,
      size: file.size,
      folder,
      reason: "unreadable_dimensions",
    });
  }

  const checkedDimensions = dimensions as { width: number; height: number };

  if (
    checkedDimensions.width <= 0 ||
    checkedDimensions.height <= 0 ||
    checkedDimensions.width > MAX_IMAGE_WIDTH ||
    checkedDimensions.height > MAX_IMAGE_HEIGHT ||
    checkedDimensions.width * checkedDimensions.height > MAX_IMAGE_PIXELS
  ) {
    await rejectUpload("La imagen tiene unas dimensiones demasiado grandes.", {
      type: file.type,
      size: file.size,
      folder,
      width: checkedDimensions.width,
      height: checkedDimensions.height,
      reason: "dimension_limit",
    });
  }

  const safeFolder = sanitizeFolder(folder);
  const extension = getExtension(file.type);
  const fileName = `${Date.now()}-${randomBytes(8).toString("hex")}${extension}`;
  const relativeDir = path.join("uploads", safeFolder);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  const absolutePath = path.join(absoluteDir, fileName);

  if (shouldInlineUpload()) {
    return buildDataUrl(file.type, bytes);
  }

  try {
    await mkdir(absoluteDir, { recursive: true });
    await writeFile(absolutePath, bytes);
  } catch (error) {
    const errorCode = typeof error === "object" && error && "code" in error ? String(error.code) : null;

    if (errorCode === "EROFS") {
      return buildDataUrl(file.type, bytes);
    }

    throw error;
  }

  return `/${relativeDir.replaceAll("\\", "/")}/${fileName}`;
}

export async function deletePublicFile(publicPath: string) {
  const absolutePath = resolvePublicUploadPath(publicPath);
  if (!absolutePath) return;

  try {
    await unlink(absolutePath);
  } catch {
    // ignore
  }
}
