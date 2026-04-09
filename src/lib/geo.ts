export function clampLatitude(value: number) {
  return Math.max(-90, Math.min(90, value));
}

export function clampLongitude(value: number) {
  return Math.max(-180, Math.min(180, value));
}

export function parseCoordinate(value: FormDataEntryValue | null, type: "lat" | "lng") {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;

  return type === "lat" ? clampLatitude(parsed) : clampLongitude(parsed);
}

export function getDistanceInKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const angle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusKm * angle;
}

export function approximateCoordinate(value: number) {
  return Number(value.toFixed(2));
}
