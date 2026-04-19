type RouteLoadingScreenProps = {
  title: string;
  description: string;
};

export function RouteLoadingScreen({ title, description }: RouteLoadingScreenProps) {
  return (
    <div className="mx-auto flex min-h-[60svh] w-full max-w-[935px] items-center justify-center px-4">
      <section className="app-card w-full max-w-md p-6 text-center">
        <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-neutral-200 border-t-sky-500" />
        <h1 className="mt-5 text-xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </section>
    </div>
  );
}
