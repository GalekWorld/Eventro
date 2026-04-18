import type { UserRole } from "@prisma/client";

export function hasRoleAccess(role: UserRole | null | undefined, allowedRoles: UserRole[]) {
  return Boolean(role && allowedRoles.includes(role));
}

export function canAccessAdminArea(role: UserRole | null | undefined) {
  return hasRoleAccess(role, ["ADMIN"]);
}

export function canAccessVenueArea(role: UserRole | null | undefined) {
  return hasRoleAccess(role, ["VENUE"]);
}

export function canAccessOwnedVenueResource({
  role,
  isOwner,
}: {
  role: UserRole | null | undefined;
  isOwner: boolean;
}) {
  return canAccessVenueArea(role) && isOwner;
}

export function canAccessEventChatPolicy({
  role,
  isOwner,
  hasConfirmedEventAccess,
}: {
  role: UserRole;
  isOwner: boolean;
  hasConfirmedEventAccess: boolean;
}) {
  if (canAccessAdminArea(role)) return true;
  if (isOwner) return true;
  return hasConfirmedEventAccess;
}

export function canAccessScannerEventPolicy({
  role,
  hasAssignment,
}: {
  role: UserRole;
  hasAssignment: boolean;
}) {
  if (canAccessAdminArea(role)) return true;
  return hasAssignment;
}
