"use client";

import { useMemo, useState, useTransition } from "react";
import { toggleStoryReactionAction } from "@/app/actions/social";
import { STORY_REACTIONS, type StoryReactionValue } from "@/lib/story-reactions";

export function StoryReactionBar({
  storyId,
  currentUserReaction,
  counts,
}: {
  storyId: string;
  currentUserReaction: StoryReactionValue | null;
  counts: Partial<Record<StoryReactionValue, number>>;
}) {
  const [selectedReaction, setSelectedReaction] = useState<StoryReactionValue | null>(currentUserReaction);
  const [reactionCounts, setReactionCounts] = useState<Partial<Record<StoryReactionValue, number>>>(counts);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");

  const summary = useMemo(
    () => ({
      currentUserReaction: selectedReaction,
      counts: reactionCounts,
    }),
    [reactionCounts, selectedReaction],
  );

  function handleReaction(nextReaction: StoryReactionValue) {
    const previousReaction = summary.currentUserReaction;
    const updatedCounts: Partial<Record<StoryReactionValue, number>> = { ...summary.counts };

    if (previousReaction) {
      updatedCounts[previousReaction] = Math.max((updatedCounts[previousReaction] ?? 1) - 1, 0);
    }

    const nextSelectedReaction = previousReaction === nextReaction ? null : nextReaction;

    if (nextSelectedReaction) {
      updatedCounts[nextSelectedReaction] = (updatedCounts[nextSelectedReaction] ?? 0) + 1;
    }

    setSelectedReaction(nextSelectedReaction);
    setReactionCounts(updatedCounts);
    setFeedback("");

    startTransition(async () => {
      const formData = new FormData();
      formData.set("storyId", storyId);
      formData.set("reaction", nextReaction);

      const result = await toggleStoryReactionAction(formData);
      if (result.error) {
        setSelectedReaction(previousReaction);
        setReactionCounts(summary.counts);
        setFeedback(result.error);
        return;
      }

      setFeedback(result.success ?? "");
    });
  }

  return (
    <div className="pointer-events-auto mt-4">
      <div className="flex flex-wrap gap-2">
        {STORY_REACTIONS.map((reaction) => {
          const isActive = summary.currentUserReaction === reaction;
          const count = summary.counts[reaction] ?? 0;

          return (
            <button
              key={reaction}
              type="button"
              disabled={isPending}
              onClick={() => handleReaction(reaction)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium backdrop-blur transition ${
                isActive ? "border-white/70 bg-white text-slate-950" : "border-white/25 bg-black/25 text-white"
              } ${isPending ? "opacity-70" : ""}`}
            >
              <span>{reaction}</span>
              <span>{count}</span>
            </button>
          );
        })}
      </div>
      {feedback ? <p className="mt-2 text-xs text-white/80">{feedback}</p> : null}
    </div>
  );
}
