export default function PostDetailLoading() {
  return (
    <div className="mx-auto max-w-[980px] px-0 sm:px-4 animate-pulse">
      <article className="app-card overflow-hidden rounded-none border-x-0 sm:rounded-[28px] sm:border-x">
        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="aspect-square bg-neutral-200 lg:min-h-[720px]" />
          <div className="flex min-h-full flex-col">
            <div className="border-b border-neutral-200 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-neutral-200" />
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded-full bg-neutral-200" />
                  <div className="h-3 w-24 rounded-full bg-neutral-100" />
                </div>
              </div>
            </div>
            <div className="border-b border-neutral-200 px-4 py-4">
              <div className="h-4 w-full rounded-full bg-neutral-100" />
              <div className="mt-2 h-4 w-3/4 rounded-full bg-neutral-100" />
            </div>
            <div className="border-b border-neutral-200 px-4 py-4">
              <p className="text-sm font-medium text-slate-500">Abriendo publicación...</p>
            </div>
            <div className="flex-1 space-y-3 px-4 py-4">
              <div className="h-16 rounded-2xl bg-neutral-100" />
              <div className="h-16 rounded-2xl bg-neutral-100" />
              <div className="h-16 rounded-2xl bg-neutral-100" />
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
