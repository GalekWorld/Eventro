"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { followUserAction } from "@/app/actions/social";

export function FollowToggleButton({
  targetUserId,
  redirectPath,
  username,
  initialFollowing,
  activeLabel = "Siguiendo",
  idleLabel = "Seguir",
  className,
}: {
  targetUserId: string;
  redirectPath: string;
  username: string;
  initialFollowing: boolean;
  activeLabel?: string;
  idleLabel?: string;
  className?: string;
}) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!message) return;

    const timeout = window.setTimeout(() => setMessage(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [message]);

  function handleClick() {
    if (isPending) return;

    const previousFollowing = isFollowing;
    const nextFollowing = !previousFollowing;

    setIsFollowing(nextFollowing);
    setMessage(
      nextFollowing
        ? `Has comenzado a seguir a ${username}`
        : `Has dejado de seguir a ${username}`,
    );

    startTransition(async () => {
      const formData = new FormData();
      formData.set("targetUserId", targetUserId);
      formData.set("redirectPath", redirectPath);

      try {
        await followUserAction(formData);
        router.refresh();
      } catch {
        setIsFollowing(previousFollowing);
        setMessage("No se pudo actualizar el seguimiento.");
      }
    });
  }

  const resolvedClassName =
    className ?? (isFollowing ? "app-button-secondary" : "app-button-primary");

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`${resolvedClassName} disabled:opacity-70`}
      >
        {isFollowing ? activeLabel : idleLabel}
      </button>
      {message ? <p className="text-xs font-medium text-emerald-600">{message}</p> : null}
    </div>
  );
}
