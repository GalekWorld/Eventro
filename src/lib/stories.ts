import { db } from "@/lib/db";
import { listHighlightedStoryIdsForUser } from "@/lib/story-metadata";

export async function purgeExpiredStories() {
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

  for (const authorId of authorIds) {
    const ids = await listHighlightedStoryIdsForUser(authorId);
    ids.forEach((id) => highlightedIds.add(id));
  }

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
