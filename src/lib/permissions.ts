import type { UserRole } from "@/lib/roles";
export { requireAuth, requireRole } from "@/lib/auth";

export function isAdmin(role?: UserRole | null) {
  return role === "ADMIN";
}

export function isVenue(role?: UserRole | null) {
  return role === "VENUE";
}

export function isVenuePending(role?: UserRole | null) {
  return role === "VENUE_PENDING";
}

export function isUser(role?: UserRole | null) {
  return role === "USER";
}

export function canCreateEvents(role?: UserRole | null) {
  return role === "VENUE";
}
