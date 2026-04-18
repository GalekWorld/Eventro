"use client";

import { toggleStoryReactionAction } from "@/app/actions/social";
import { STORY_REACTIONS, type StoryReactionValue } from "@/lib/story-reactions";

export function StoryReactionBar({
  storyId,
  redirectPath,
  currentUserReaction,
  counts,
}: {
  storyId: string;
  redirectPath: string;
  currentUserReaction: StoryReactionValue | null;
  counts: Partial<Record<StoryReactionValue, number>>;
}) {
  return (
    <div className="pointer-events-auto mt-4 flex flex-wrap gap-2">
      {STORY_REACTIONS.map((reaction) => {
        const isActive = currentUserReaction === reaction;
        const count = counts[reaction] ?? 0;

        return (
          <form key={reaction} action={toggleStoryReactionAction}>
            <input type="hidden" name="storyId" value={storyId} />
            <input type="hidden" name="reaction" value={reaction} />
            <input type="hidden" name="redirectPath" value={redirectPath} />
            <button
              type="submit"
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium backdrop-blur transition ${
                isActive ? "border-white/70 bg-white text-slate-950" : "border-white/25 bg-black/25 text-white"
              }`}
            >
              <span>{reaction}</span>
              <span>{count}</span>
            </button>
          </form>
        );
      })}
    </div>
  );
}
