"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleCommentLikeAction } from "@/app/actions/social";

export function CommentLikeButton({
  commentId,
  redirectPath,
  initialLiked,
  initialLikeCount,
}: {
  commentId: string;
  redirectPath: string;
  initialLiked: boolean;
  initialLikeCount: number;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (isPending) {
      return;
    }

    const previousLiked = liked;
    const previousLikeCount = likeCount;
    const nextLiked = !liked;
    const nextLikeCount = Math.max(0, likeCount + (nextLiked ? 1 : -1));

    setLiked(nextLiked);
    setLikeCount(nextLikeCount);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("commentId", commentId);
      formData.set("redirectPath", redirectPath);

      try {
        await toggleCommentLikeAction(formData);
      } catch {
        setLiked(previousLiked);
        setLikeCount(previousLikeCount);
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`text-xs font-medium transition disabled:opacity-70 ${liked ? "text-rose-500" : "text-slate-500"}`}
    >
      {liked ? "Te gusta" : "Me gusta"} · {likeCount}
    </button>
  );
}
