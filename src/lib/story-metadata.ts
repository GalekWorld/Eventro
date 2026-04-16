import { db } from "@/lib/db";

const STORY_HIGHLIGHT_TYPE = "story_highlight";
const STORY_VIEW_TYPE = "story_view";

export async function listHighlightedStoryIdsForUser(userId: string) {
  const events = await db.securityEvent.findMany({
    where: {
      type: STORY_HIGHLIGHT_TYPE,
      userId,
    },
    orderBy: { createdAt: "desc" },
    select: {
      key: true,
      message: true,
    },
  });

  const highlighted = new Set<string>();
  const resolved = new Set<string>();

  for (const event of events) {
    if (!event.key || resolved.has(event.key)) continue;
    resolved.add(event.key);
    if (event.message === "highlighted") {
      highlighted.add(event.key);
    }
  }

  return Array.from(highlighted);
}

export async function registerStoryView({
  storyId,
  viewerId,
  ownerId,
}: {
  storyId: string;
  viewerId: string;
  ownerId: string;
}) {
  if (viewerId === ownerId) {
    return;
  }

  const existing = await db.securityEvent.findFirst({
    where: {
      type: STORY_VIEW_TYPE,
      key: storyId,
      userId: viewerId,
    },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  await db.securityEvent.create({
    data: {
      type: STORY_VIEW_TYPE,
      key: storyId,
      userId: viewerId,
      message: "viewed",
      metadata: JSON.stringify({ ownerId }),
    },
  });
}

export async function getStoryViewSummaries(storyIds: string[]) {
  if (storyIds.length === 0) {
    return new Map<string, { count: number; viewers: Array<{ id: string; username: string | null; name: string | null; avatarUrl: string | null }> }>();
  }

  const events = await db.securityEvent.findMany({
    where: {
      type: STORY_VIEW_TYPE,
      key: { in: storyIds },
      userId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: {
      key: true,
      userId: true,
    },
  });

  const perStoryViewerIds = new Map<string, string[]>();

  for (const event of events) {
    if (!event.key || !event.userId) continue;
    const current = perStoryViewerIds.get(event.key) ?? [];
    if (!current.includes(event.userId)) {
      current.push(event.userId);
      perStoryViewerIds.set(event.key, current);
    }
  }

  const uniqueViewerIds = Array.from(new Set(Array.from(perStoryViewerIds.values()).flat()));
  const viewers = uniqueViewerIds.length
    ? await db.user.findMany({
        where: {
          id: { in: uniqueViewerIds },
        },
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true,
        },
      })
    : [];

  const viewerMap = new Map(viewers.map((viewer) => [viewer.id, viewer]));
  const summary = new Map<
    string,
    {
      count: number;
      viewers: Array<{ id: string; username: string | null; name: string | null; avatarUrl: string | null }>;
    }
  >();

  for (const storyId of storyIds) {
    const viewerIds = perStoryViewerIds.get(storyId) ?? [];
    summary.set(storyId, {
      count: viewerIds.length,
      viewers: viewerIds.map((viewerId) => viewerMap.get(viewerId)).filter(Boolean) as Array<{
        id: string;
        username: string | null;
        name: string | null;
        avatarUrl: string | null;
      }>,
    });
  }

  return summary;
}
