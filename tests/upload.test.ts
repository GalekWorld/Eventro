import assert from "node:assert/strict";
import { resolvePublicUploadPath } from "../src/lib/upload-path.ts";

export function runUploadTests() {
  const validPath = resolvePublicUploadPath("/uploads/events/photo.jpg");

  assert.ok(validPath);
  assert.equal(
    validPath?.includes("\\public\\uploads\\events\\photo.jpg") || validPath?.includes("/public/uploads/events/photo.jpg"),
    true,
  );
  assert.equal(resolvePublicUploadPath("/uploads/../secret.txt"), null);
  assert.equal(resolvePublicUploadPath("/uploads/events/../../secret.txt"), null);
  assert.equal(resolvePublicUploadPath("/avatars/photo.jpg"), null);
}
