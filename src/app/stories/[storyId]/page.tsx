import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isBlockedBetween } from "@/lib/privacy";
import { purgeExpiredStories } from "@/lib/stories";
import { StoryDeleteButton } from "@/components/story-delete-button";
import { StoryViewer } from "@/components/story-viewer";

export default async function StoryPage({ params }: { params: Promise<{ storyId: string }> }) {
  await purgeExpiredStories();
  const { storyId } = await params;
  const currentUser = await getCurrentUser();

  const visibleStories = await db.story.findMany({
    where: {
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      author: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true,
          isVerified: true,
          role: true,
        },
      },
    },
  });

  let stories = visibleStories;

  if (currentUser) {
    const filtered: typeof visibleStories = [];
    for (const story of visibleStories) {
      if (await isBlockedBetween(currentUser.id, story.author.id)) continue;
      filtered.push(story);
    }
    stories = filtered;
  }

  const story = stories.find((item) => item.id === storyId);

  if (!story) notFound();

  return (
    <StoryViewer
      currentStoryId={story.id}
      stories={stories}
      canDeleteCurrent={currentUser?.id === story.author.id}
      closeHref={currentUser?.id === story.author.id ? "/profile" : `/u/${story.author.username ?? ""}`}
      deleteButton={currentUser?.id === story.author.id ? <StoryDeleteButton storyId={story.id} /> : null}
    />
  );
}
