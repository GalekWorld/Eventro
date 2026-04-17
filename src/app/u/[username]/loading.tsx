export default function PublicProfileLoading() {
  return (
    <div className="mx-auto max-w-[935px] space-y-4 animate-pulse">
      <section className="app-card p-5 sm:p-7">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="mx-auto h-24 w-24 rounded-full bg-neutral-200 sm:mx-0 sm:h-36 sm:w-36" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="h-8 w-44 rounded-full bg-neutral-200" />
              <div className="flex gap-2">
                <div className="h-10 w-24 rounded-full bg-neutral-100" />
                <div className="h-10 w-24 rounded-full bg-neutral-100" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-5 text-sm">
              <div className="h-4 w-24 rounded-full bg-neutral-100" />
              <div className="h-4 w-24 rounded-full bg-neutral-100" />
              <div className="h-4 w-24 rounded-full bg-neutral-100" />
            </div>

            <div className="mt-5 rounded-3xl border border-sky-100 bg-sky-50/70 px-4 py-3">
              <p className="text-sm font-medium text-sky-700">Cargando perfil...</p>
              <p className="mt-1 text-xs text-sky-600">Preparando publicaciones, historias y datos del usuario.</p>
            </div>

            <div className="mt-4 space-y-2">
              <div className="h-4 w-32 rounded-full bg-neutral-200" />
              <div className="h-4 w-full max-w-[440px] rounded-full bg-neutral-100" />
              <div className="h-4 w-24 rounded-full bg-neutral-100" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-1 sm:gap-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="aspect-square rounded-[18px] bg-neutral-100" />
        ))}
      </section>
    </div>
  );
}
