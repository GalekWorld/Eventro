export default function StoryLoading() {
  return (
    <div className="mx-auto flex min-h-[100svh] w-full max-w-[440px] items-center justify-center px-0 sm:px-4">
      <section className="relative h-[100svh] w-full overflow-hidden bg-black sm:h-auto sm:max-h-[92svh] sm:aspect-[9/16] sm:rounded-[28px]">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 via-neutral-800 to-black" />
        <div className="absolute inset-x-0 top-0 z-10 p-4">
          <div className="flex gap-1.5">
            <div className="h-1.5 flex-1 rounded-full bg-white/40" />
            <div className="h-1.5 flex-1 rounded-full bg-white/20" />
            <div className="h-1.5 flex-1 rounded-full bg-white/20" />
          </div>
        </div>
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="text-lg font-semibold text-white">Abriendo historia...</p>
          <p className="mt-2 text-sm text-white/75">Preparando la imagen y el contenido.</p>
        </div>
      </section>
    </div>
  );
}
