import { db } from "@/lib/db";
import { listHighlightedStoryIdsForUser } from "@/lib/story-metadata";

const STORY_PURGE_INTERVAL_MS = 5 * 60 * 1000;

const storyMaintenanceState = globalThis as typeof globalThis & {
  __eventroStoryPurgeAt?: number;
};

export async function purgeExpiredStories() {
  const now = Date.now();
  if (storyMaintenanceState.__eventroStoryPurgeAt && now - storyMaintenanceState.__eventroStoryPurgeAt < STORY_PURGE_INTERVAL_MS) {
    return;
  }

  storyMaintenanceState.__eventroStoryPurgeAt = now;

  const expiredStories = await db.story.findMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
    },
    select: {
      id: true,
      authorId: true,
    },
  });

  if (expiredStories.length === 0) {
    return;
  }

  const highlightedIds = new Set<string>();
  const authorIds = Array.from(new Set(expiredStories.map((story) => story.authorId)));
  const highlightedByAuthor = await Promise.all(authorIds.map((authorId) => listHighlightedStoryIdsForUser(authorId)));
  highlightedByAuthor.forEach((ids) => ids.forEach((id) => highlightedIds.add(id)));

  const deletableIds = expiredStories.filter((story) => !highlightedIds.has(story.id)).map((story) => story.id);

  if (deletableIds.length === 0) {
    return;
  }

  await db.story.deleteMany({
    where: {
      id: {
        in: deletableIds,
      },
    },
  });
}
