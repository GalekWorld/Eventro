type ChartPoint = {
  label: string;
  value: number;
  accent?: string;
};

export function AnalyticsChart({
  title,
  subtitle,
  points,
  formatValue,
}: {
  title: string;
  subtitle: string;
  points: ChartPoint[];
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <section className="app-card p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

      <div className="mt-5 grid gap-3">
        {points.map((point) => {
          const width = `${Math.max((point.value / max) * 100, point.value > 0 ? 6 : 0)}%`;

          return (
            <div key={point.label} className="grid gap-2">
              <div className="flex items-start justify-between gap-3 text-sm">
                <span className="min-w-0 flex-1 break-words text-slate-600">{point.label}</span>
                <span className="shrink-0 font-semibold text-slate-950">
                  {formatValue ? formatValue(point.value) : point.value}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width,
                    background: point.accent ?? "linear-gradient(90deg, #0ea5e9, #38bdf8)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
