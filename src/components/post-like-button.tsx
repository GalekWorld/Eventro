"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { togglePostLikeAction } from "@/app/actions/social";

export function PostLikeButton({
  postId,
  redirectPath,
  initialLiked,
  className = "",
  iconClassName = "h-6 w-6",
}: {
  postId: string;
  redirectPath: string;
  initialLiked: boolean;
  className?: string;
  iconClassName?: string;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (isPending) {
      return;
    }

    const previousLiked = liked;
    setLiked(!liked);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("postId", postId);
      formData.set("redirectPath", redirectPath);

      try {
        await togglePostLikeAction(formData);
      } catch {
        setLiked(previousLiked);
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`${liked ? "text-rose-500" : "text-slate-800"} transition disabled:opacity-70 ${className}`}
      aria-label="Dar like"
      aria-pressed={liked}
    >
      <Heart className={`${iconClassName} ${liked ? "fill-current" : ""}`} />
    </button>
  );
}
