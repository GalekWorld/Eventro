import type { Prisma } from "@prisma/client";

const EVENT_RETENTION_AFTER_END_MS = 24 * 60 * 60 * 1000;

export function getEventVisibilityCutoffDate(now = new Date()) {
  return new Date(now.getTime() - EVENT_RETENTION_AFTER_END_MS);
}

export function getVisiblePublishedEventsWhere(now = new Date()): Prisma.EventWhereInput {
  const cutoff = getEventVisibilityCutoffDate(now);

  return {
    published: true,
    OR: [
      { endDate: { gt: cutoff } },
      {
        endDate: null,
        date: { gt: cutoff },
      },
    ],
  };
}
