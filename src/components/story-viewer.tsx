"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { getVerificationTone, isPubliclyVerified } from "@/lib/user-display";

type StoryItem = {
  id: string;
  imageUrl: string;
  caption: string | null;
  durationSec: number;
  author: {
    id: string;
    username: string | null;
    name: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
    role: "USER" | "VENUE_PENDING" | "VENUE" | "ADMIN";
  };
};

type StoryViewerProps = {
  currentStoryId: string;
  stories: StoryItem[];
  canDeleteCurrent: boolean;
  closeHref: string;
  deleteButton?: React.ReactNode;
};

export function StoryViewer({ currentStoryId, stories, canDeleteCurrent, closeHref, deleteButton }: StoryViewerProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const currentIndex = useMemo(() => stories.findIndex((story) => story.id === currentStoryId), [stories, currentStoryId]);
  const currentStory = currentIndex >= 0 ? stories[currentIndex] : null;
  const nextStory = currentIndex >= 0 ? stories[currentIndex + 1] : null;
  const previousStory = currentIndex > 0 ? stories[currentIndex - 1] : null;

  useEffect(() => {
    setProgress(0);
    if (!currentStory) return;

    const durationMs = Math.min(Math.max(currentStory.durationSec, 5), 15) * 1000;
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const nextProgress = Math.min(((Date.now() - startedAt) / durationMs) * 100, 100);
      setProgress(nextProgress);
    }, 100);

    const timeout = window.setTimeout(() => {
      if (nextStory) {
        router.replace(`/stories/${nextStory.id}`);
      } else {
        router.replace(closeHref);
      }
    }, durationMs);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [closeHref, currentStory, nextStory, router]);

  if (!currentStory) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-[100svh] w-full max-w-[460px] items-center justify-center px-0 sm:px-4">
      <section className="relative h-[100svh] w-full overflow-hidden bg-black sm:h-auto sm:rounded-[28px] sm:shadow-2xl">
        <div className="absolute inset-x-0 top-0 z-20 p-3 sm:p-4">
          <div className="flex gap-1.5">
            {stories.map((story, index) => {
              const isCurrent = index === currentIndex;
              const isDone = index < currentIndex;

              return (
                <div key={story.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
                  <div
                    className="h-full rounded-full bg-white transition-[width] duration-100"
                    style={{ width: `${isDone ? 100 : isCurrent ? progress : 0}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar user={currentStory.author} className="h-11 w-11 bg-neutral-100" textClassName="text-sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Link href={`/u/${currentStory.author.username ?? ""}`} className="truncate text-sm font-semibold text-white">
                    @{currentStory.author.username ?? "usuario"}
                  </Link>
                  {isPubliclyVerified(currentStory.author) ? <VerifiedBadge tone={getVerificationTone(currentStory.author)} /> : null}
                </div>
                <p className="truncate text-xs text-white/75">{currentStory.author.name ?? "Usuario"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canDeleteCurrent ? deleteButton : null}
              <Link href={closeHref} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur">
                <X className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="relative h-full min-h-[100svh] w-full sm:min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentStory.imageUrl} alt={currentStory.caption ?? "Historia"} className="h-full w-full object-cover" />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/20 to-transparent px-4 pb-8 pt-24 sm:px-5 sm:pb-5">
            <p className="text-sm font-medium text-white">{currentStory.caption ?? "Sin texto"}</p>
            <p className="mt-2 text-xs text-white/75">
              {currentStory.durationSec}s de visualización · Disponible durante 24 horas desde su publicación.
            </p>
          </div>

          {previousStory ? (
            <button
              type="button"
              onClick={() => router.replace(`/stories/${previousStory.id}`)}
              className="absolute left-3 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur"
              aria-label="Historia anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <Link
              href={closeHref}
              className="absolute left-3 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur"
              aria-label="Volver"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}

          {nextStory ? (
            <button
              type="button"
              onClick={() => router.replace(`/stories/${nextStory.id}`)}
              className="absolute right-3 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur"
              aria-label="Siguiente historia"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
