import { revalidatePath } from "next/cache";

export function toSafeInternalPath(input?: string | null, fallback = "/dashboard") {
  const value = String(input ?? "").trim();

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (value.includes("..")) {
    return fallback;
  }

  return value;
}

export function safeRevalidatePath(input?: string | null, fallback = "/dashboard") {
  revalidatePath(toSafeInternalPath(input, fallback));
}
