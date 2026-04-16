import { deleteStoryAction, toggleStoryHighlightAction } from "@/app/actions/social";

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
  return (
    <div className="space-y-2 rounded-2xl bg-white/90 p-2 shadow-sm">
      <form action={toggleStoryHighlightAction}>
        <input type="hidden" name="storyId" value={storyId} />
        <button type="submit" className="inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm">
          {isHighlighted ? "Quitar destacada" : "Destacar en perfil"}
        </button>
      </form>

      <form action={deleteStoryAction}>
        <input type="hidden" name="storyId" value={storyId} />
        <button type="submit" className="inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm">
          Eliminar
        </button>
      </form>

      <div className="rounded-2xl bg-white px-3 py-2 text-left text-xs text-slate-700">
        <p className="font-semibold text-slate-950">{viewCount} vista{viewCount === 1 ? "" : "s"}</p>
        {viewers.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {viewers.slice(0, 6).map((viewer) => (
              <span key={viewer.id} className="rounded-full bg-neutral-100 px-2 py-1">
                @{viewer.username ?? viewer.name ?? "usuario"}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-slate-500">Aún no la ha visto nadie.</p>
        )}
      </div>
    </div>
  );
}
