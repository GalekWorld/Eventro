import type { UserRole } from "@prisma/client";

type PublicUserLike = {
  isVerified?: boolean | null;
  role?: UserRole | null;
  username?: string | null;
  name?: string | null;
  email?: string | null;
};

export function getActorLabel(user: PublicUserLike | null | undefined) {
  if (!user) {
    return "Usuario desconocido";
  }

  if (user.username) {
    return `@${user.username}`;
  }

  if (user.name) {
    return user.name;
  }

  if (user.email) {
    return user.email;
  }

  return "Usuario desconocido";
}

export function isPubliclyVerified(user: PublicUserLike) {
  return Boolean(user.isVerified || user.role === "ADMIN" || user.role === "VENUE");
}

export function getVerificationTone(user: PublicUserLike): "blue" | "red" {
  return user.role === "ADMIN" ? "blue" : "red";
}

export function getPublicUsername(user: PublicUserLike) {
  return user.username ?? "usuario";
}

export function getAvatarFallback(user: PublicUserLike) {
  const source = user.username ?? user.name ?? user.email ?? "u";
  return source.slice(0, 1).toUpperCase();
}
