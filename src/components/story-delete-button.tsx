"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Eye, Star, Trash2 } from "lucide-react";
import { deleteStoryAction, toggleStoryHighlightAction } from "@/app/actions/social";
import { UserAvatar } from "@/components/user-avatar";

export function StoryDeleteButton({
  storyId,
  isHighlighted = false,
  viewCount = 0,
  viewers = [],
}: {
  storyId: string;
  isHighlighted?: boolean;
  viewCount?: number;
  viewers?: Array<{
    id: string;
    username: string | null;
    name: string | null;
    avatarUrl?: string | null;
  }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");

  function toggleHighlight() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("storyId", storyId);

      const result = await toggleStoryHighlightAction(formData);
      if (result.error) {
        setFeedback(result.error);
        return;
      }

      setFeedback(result.success ?? "");
      setIsOpen(false);
      router.refresh();
    });
  }

  function deleteStory() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("storyId", storyId);

      const result = await deleteStoryAction(formData);
      if (result.error) {
        setFeedback(result.error);
        return;
      }

      if (pathname.startsWith("/stories/")) {
        router.replace("/profile/private?notice=story-deleted");
        return;
      }

      setFeedback(result.success ?? "");
      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm"
      >
        Gestionar
        <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-[260px] rounded-3xl border border-neutral-200 bg-white p-3 text-left shadow-xl">
          <div className="space-y-2">
            <button
              type="button"
              onClick={toggleHighlight}
              disabled={isPending}
              className="flex w-full items-center justify-between rounded-2xl bg-neutral-50 px-3 py-2 text-sm font-medium text-slate-800"
            >
                <span>{isHighlighted ? "Quitar destacada" : "Destacar en perfil"}</span>
                <Star className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={deleteStory}
              disabled={isPending}
              className="flex w-full items-center justify-between rounded-2xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
            >
                <span>Eliminar historia</span>
                <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 rounded-2xl bg-neutral-50 px-3 py-3 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-slate-500" />
              <p className="font-semibold text-slate-950">{viewCount} vista{viewCount === 1 ? "" : "s"}</p>
            </div>

            {viewers.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {viewers.slice(0, 5).map((viewer) => (
                  <div key={viewer.id} className="flex items-center gap-2 rounded-2xl bg-white px-2 py-2">
                    <UserAvatar user={viewer} className="h-8 w-8 bg-neutral-100" textClassName="text-xs" />
                    <p className="truncate text-xs font-medium text-slate-700">@{viewer.username ?? viewer.name ?? "usuario"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-slate-500">Aun no la ha visto nadie.</p>
            )}
          </div>
        </div>
      ) : null}
      {feedback ? <p className="mt-2 text-center text-xs text-slate-600">{feedback}</p> : null}
    </div>
  );
}
