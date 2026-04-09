type LinePoint = {
  label: string;
  value: number;
};

function buildPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export function AnalyticsLineChart({
  title,
  subtitle,
  points,
  color = "#0ea5e9",
  valueFormatter,
}: {
  title: string;
  subtitle: string;
  points: LinePoint[];
  color?: string;
  valueFormatter?: (value: number) => string;
}) {
  const width = 560;
  const height = 220;
  const padding = 22;
  const max = Math.max(...points.map((point) => point.value), 1);

  const chartPoints = points.map((point, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(points.length - 1, 1);
    const y = height - padding - (point.value / max) * (height - padding * 2);
    return { ...point, x, y };
  });

  const linePath = buildPath(chartPoints);
  const areaPath = linePath
    ? `${linePath} L ${chartPoints[chartPoints.length - 1]?.x ?? width - padding} ${height - padding} L ${chartPoints[0]?.x ?? padding} ${height - padding} Z`
    : "";

  return (
    <section className="app-card p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

      <div className="mt-5 overflow-hidden rounded-[24px] border border-neutral-200 bg-gradient-to-b from-white to-neutral-50 p-3 sm:p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
          <defs>
            <linearGradient id={`gradient-${title.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75, 1].map((step) => {
            const y = height - padding - step * (height - padding * 2);
            return <line key={step} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="4 6" />;
          })}

          {areaPath ? <path d={areaPath} fill={`url(#gradient-${title.replace(/\s+/g, "-")})`} /> : null}
          {linePath ? <path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}

          {chartPoints.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="4" fill={color} />
            </g>
          ))}
        </svg>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {points.map((point) => (
            <div key={point.label} className="rounded-2xl bg-white px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{point.label}</p>
              <p className="mt-1 break-words text-sm font-semibold text-slate-950">
                {valueFormatter ? valueFormatter(point.value) : point.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
