import { db } from "@/lib/db";

const STORY_REACTION_TYPE = "story_reaction";

export const STORY_REACTIONS = ["🔥", "❤️", "👏", "😍"] as const;
export type StoryReactionValue = (typeof STORY_REACTIONS)[number];

function isValidReaction(value: string): value is StoryReactionValue {
  return STORY_REACTIONS.includes(value as StoryReactionValue);
}

export async function toggleStoryReactionForUser({
  storyId,
  userId,
  reaction,
}: {
  storyId: string;
  userId: string;
  reaction: string;
}) {
  if (!isValidReaction(reaction)) {
    return;
  }

  const existing = await db.securityEvent.findFirst({
    where: {
      type: STORY_REACTION_TYPE,
      key: storyId,
      userId,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      message: true,
    },
  });

  if (existing?.message === reaction) {
    await db.securityEvent.deleteMany({
      where: {
        type: STORY_REACTION_TYPE,
        key: storyId,
        userId,
      },
    });
    return;
  }

  await db.securityEvent.deleteMany({
    where: {
      type: STORY_REACTION_TYPE,
      key: storyId,
      userId,
    },
  });

  await db.securityEvent.create({
    data: {
      type: STORY_REACTION_TYPE,
      key: storyId,
      userId,
      message: reaction,
    },
  });
}

export async function getStoryReactionSummaries(storyIds: string[], currentUserId?: string | null) {
  if (storyIds.length === 0) {
    return new Map<string, { counts: Partial<Record<StoryReactionValue, number>>; currentUserReaction: StoryReactionValue | null }>();
  }

  const events = await db.securityEvent.findMany({
    where: {
      type: STORY_REACTION_TYPE,
      key: { in: storyIds },
      userId: { not: null },
      message: { in: [...STORY_REACTIONS] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      key: true,
      userId: true,
      message: true,
    },
  });

  const summaries = new Map<string, { counts: Partial<Record<StoryReactionValue, number>>; currentUserReaction: StoryReactionValue | null }>();
  const seenPairs = new Set<string>();

  for (const storyId of storyIds) {
    summaries.set(storyId, { counts: {}, currentUserReaction: null });
  }

  for (const event of events) {
    if (!event.key || !event.userId || !isValidReaction(event.message)) {
      continue;
    }

    const pairKey = `${event.key}:${event.userId}`;
    if (seenPairs.has(pairKey)) {
      continue;
    }
    seenPairs.add(pairKey);

    const current = summaries.get(event.key);
    if (!current) {
      continue;
    }

    current.counts[event.message] = (current.counts[event.message] ?? 0) + 1;
    if (currentUserId && event.userId === currentUserId) {
      current.currentUserReaction = event.message;
    }
  }

  return summaries;
}
