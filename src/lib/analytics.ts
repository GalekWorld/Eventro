import "server-only";

import { createHash } from "crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";

export const PLATFORM_FEE_RATE = 0.0004;

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function formatDayKey(date: Date) {
  return startOfDay(date);
}

function hashViewerKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export async function registerEventView({
  eventId,
  viewerId,
}: {
  eventId: string;
  viewerId?: string | null;
}) {
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") ?? "unknown";
  const forwardedFor = headerStore.get("x-forwarded-for") ?? "no-ip";
  const acceptLanguage = headerStore.get("accept-language") ?? "no-lang";
  const day = formatDayKey(new Date());
  const viewerKey = viewerId
    ? `user:${viewerId}`
    : `anon:${hashViewerKey(`${forwardedFor}|${userAgent}|${acceptLanguage}`)}`;

  await db.eventView.upsert({
    where: {
      eventId_viewerKey_viewedOn: {
        eventId,
        viewerKey,
        viewedOn: day,
      },
    },
    update: {},
    create: {
      eventId,
      viewerKey,
      viewerId: viewerId ?? null,
      viewedOn: day,
    },
  }).catch(() => null);
}
