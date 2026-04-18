import path from "path";

export function getPublicUploadsRoot() {
  return path.resolve(process.cwd(), "public", "uploads");
}

export function resolvePublicUploadPath(publicPath: string) {
  const normalized = String(publicPath ?? "").trim().replaceAll("\\", "/");

  if (!normalized.startsWith("/uploads/")) {
    return null;
  }

  const relativePath = normalized.slice("/uploads/".length);
  if (!relativePath || relativePath.includes("..")) {
    return null;
  }

  const uploadsRoot = getPublicUploadsRoot();
  const absolutePath = path.resolve(uploadsRoot, relativePath);
  const relativeToRoot = path.relative(uploadsRoot, absolutePath);

  if (!relativeToRoot || relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  return absolutePath;
}
