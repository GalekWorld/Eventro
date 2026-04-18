import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser, requireAuth, requireRole } from "@/lib/auth";
import { canAccessAdminArea, canAccessVenueArea, hasRoleAccess } from "@/lib/access-control";

export { requireAuth, requireRole } from "@/lib/auth";

export async function requirePageAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export function isAdmin(role?: UserRole | null) {
  return canAccessAdminArea(role);
}

export function isVenue(role?: UserRole | null) {
  return canAccessVenueArea(role);
}

export function isVenuePending(role?: UserRole | null) {
  return hasRoleAccess(role, ["VENUE_PENDING"]);
}

export function isUser(role?: UserRole | null) {
  return hasRoleAccess(role, ["USER"]);
}

export function canCreateEvents(role?: UserRole | null) {
  return canAccessVenueArea(role);
}
