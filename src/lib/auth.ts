import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

async function getCookieStore(): Promise<CookieStore> {
  return cookies();
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getSessionToken() {
  const cookieStore = await getCookieStore();
  return cookieStore.get("session")?.value ?? null;
}

const getUserFromSessionToken = cache(async (sessionToken?: string | null) => {
  if (!sessionToken) return null;

  const hashedToken = hashSessionToken(sessionToken);
  let session = await prisma.session.findUnique({
    where: { token: hashedToken },
    include: { user: true },
  });

  if (!session) {
    const legacySession = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    if (legacySession) {
      await prisma.session
        .update({
          where: { id: legacySession.id },
          data: { token: hashedToken },
        })
        .catch(() => null);

      session = {
        ...legacySession,
        token: hashedToken,
      };
    }
  }

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await deleteSession(sessionToken).catch(() => null);

    const cookieStore = await getCookieStore();
    cookieStore.delete("session");

    return null;
  }

  return session.user;
});

export async function getCurrentUser() {
  const sessionToken = await getSessionToken();
  return getUserFromSessionToken(sessionToken);
}

export async function getSessionUser() {
  return getCurrentUser();
}

export function getDefaultAppPathForRole(role?: UserRole | null) {
  if (role === "VENUE") {
    return "/local/dashboard";
  }

  if (role === "VENUE_PENDING") {
    return "/venue/pending";
  }

  return "/dashboard";
}

export const getCanScanForUser = cache(async (userId?: string | null, role?: UserRole | null) => {
  if (!userId) {
    return false;
  }

  if (role === "ADMIN") {
    return true;
  }

  const assignment = await prisma.venueDoorStaff.findFirst({
    where: { staffUserId: userId },
    select: { id: true },
  });

  return Boolean(assignment);
});

export async function requireUser() {
  const sessionToken = await getSessionToken();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  if (user.suspendedAt) {
    if (sessionToken) {
      await deleteSession(sessionToken).catch(() => null);
    }

    const cookieStore = await getCookieStore();
    cookieStore.delete("session");
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

export async function requireSessionUser() {
  return requireUser();
}

export async function requireAuth() {
  return requireUser();
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireUser();

  if (!roles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string, days = 7) {
  const rawToken = createSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.session.deleteMany({
    where: { userId },
  });

  await prisma.session.create({
    data: {
      token: tokenHash,
      userId,
      expiresAt,
    },
  });

  return { token: rawToken, expiresAt };
}

export async function setSessionCookies(token: string, _role?: string, maxAgeDays = 7) {
  const cookieStore = await getCookieStore();
  const maxAge = maxAgeDays * 24 * 60 * 60;

  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function setSessionCookie(token: string, role?: string, maxAgeDays = 7) {
  return setSessionCookies(token, role, maxAgeDays);
}

export async function clearSessionCookies() {
  const cookieStore = await getCookieStore();
  cookieStore.delete("session");
}

export async function clearSessionCookie() {
  return clearSessionCookies();
}

export async function deleteSession(token: string) {
  await prisma.session
    .deleteMany({
      where: {
        token: {
          in: [token, hashSessionToken(token)],
        },
      },
    })
    .catch(() => null);
}
