function normalizeBaseUrl(value?: string | null) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }

  try {
    return new URL(normalized);
  } catch {
    return null;
  }
}

export function getAppBaseUrl() {
  const configured = normalizeBaseUrl(process.env.APP_URL);

  if (configured) {
    if (process.env.NODE_ENV === "production" && configured.protocol !== "https:") {
      throw new Error("APP_URL debe usar https en produccion.");
    }

    return configured.origin;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_URL es obligatoria en produccion.");
  }

  return "http://localhost:3000";
}
