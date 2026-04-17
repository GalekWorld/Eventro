type ScreenLoadingProps = {
  title: string;
  blocks?: number;
};

export function ScreenLoading({ title, blocks = 3 }: ScreenLoadingProps) {
  return (
    <div className="mx-auto max-w-[980px] space-y-4 animate-pulse">
      <section className="app-card p-4 sm:p-5">
        <div className="h-7 w-36 rounded-full bg-neutral-200" />
        <div className="mt-3 h-4 w-64 rounded-full bg-neutral-100" />
      </section>

      <section className="app-card p-4 sm:p-5">
        <p className="text-sm font-semibold text-slate-400">{title}</p>
        <div className="mt-4 space-y-3">
          {Array.from({ length: blocks }).map((_, index) => (
            <div key={index} className="rounded-3xl border border-neutral-100 bg-neutral-50 p-4">
              <div className="h-4 w-40 rounded-full bg-neutral-200" />
              <div className="mt-3 h-3 w-28 rounded-full bg-neutral-100" />
              <div className="mt-4 h-20 rounded-[24px] bg-neutral-100" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
