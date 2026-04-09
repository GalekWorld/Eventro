import { deleteStoryAction } from "@/app/actions/social";

export function StoryDeleteButton({ storyId }: { storyId: string }) {
  return (
    <form action={deleteStoryAction}>
      <input type="hidden" name="storyId" value={storyId} />
      <button type="submit" className="inline-flex rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm">
        Eliminar
      </button>
    </form>
  );
}
