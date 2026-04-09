export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="app-card p-6 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{description}</p>
    </div>
  );
}
