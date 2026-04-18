import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getBlockedUserIds } from "@/lib/privacy";
import { purgeExpiredStories } from "@/lib/stories";
import { StoryDeleteButton } from "@/components/story-delete-button";
import { StoryViewer } from "@/components/story-viewer";
import { getStoryViewSummaries, listHighlightedStoryIdsForUser, registerStoryView } from "@/lib/story-metadata";
import { getStoryReactionSummaries } from "@/lib/story-reactions";

export default async function StoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ storyId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  await purgeExpiredStories();
  const { storyId } = await params;
  const routeSearchParams = await searchParams;
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
    const blockedUserIds = new Set(await getBlockedUserIds(currentUser.id));
    stories = visibleStories.filter((item) => !blockedUserIds.has(item.author.id));
  }

  const story = stories.find((item) => item.id === storyId);

  if (!story) notFound();

  if (currentUser) {
    await registerStoryView({
      storyId: story.id,
      viewerId: currentUser.id,
      ownerId: story.author.id,
    });
  }

  const selectedAuthorId = story.author.id;
  const selectedAuthorStories = stories
    .filter((item) => item.author.id === selectedAuthorId)
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

  const remainingAuthorIds = Array.from(new Set(stories.map((item) => item.author.id))).filter((authorId) => authorId !== selectedAuthorId);
  const remainingStories = remainingAuthorIds.flatMap((authorId) =>
    stories
      .filter((item) => item.author.id === authorId)
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()),
  );

  const orderedStories = [...selectedAuthorStories, ...remainingStories];
  const highlightedIds = currentUser?.id === story.author.id ? await listHighlightedStoryIdsForUser(currentUser.id) : [];
  const isHighlighted = highlightedIds.includes(story.id);
  const viewSummaries = currentUser?.id === story.author.id ? await getStoryViewSummaries([story.id]) : new Map();
  const reactionSummaries = await getStoryReactionSummaries(orderedStories.map((item) => item.id), currentUser?.id);
  const currentStoryViews = viewSummaries.get(story.id) ?? { count: 0, viewers: [] };

  const closeHref = routeSearchParams.from === "profile-private" ? "/profile/private" : "/dashboard";

  return (
    <StoryViewer
      currentStoryId={story.id}
      stories={orderedStories}
      canDeleteCurrent={currentUser?.id === story.author.id}
      closeHref={closeHref}
      storyReactions={Object.fromEntries(reactionSummaries)}
      deleteButton={
        currentUser?.id === story.author.id ? (
          <StoryDeleteButton
            storyId={story.id}
            isHighlighted={isHighlighted}
            viewCount={currentStoryViews.count}
            viewers={currentStoryViews.viewers}
          />
        ) : null
      }
    />
  );
}
