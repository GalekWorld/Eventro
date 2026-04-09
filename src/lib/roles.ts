export const USER_ROLE = {
  USER: "USER",
  ADMIN: "ADMIN",
  VENUE: "VENUE",
  VENUE_PENDING: "VENUE_PENDING",
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];
