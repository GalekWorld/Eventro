import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  helper,
  icon,
  trend,
}: {
  label: string;
  value: string;
  helper: string;
  icon?: ReactNode;
  trend?: string;
}) {
  return (
    <div className="app-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm leading-5 text-slate-500">{label}</p>
        {icon}
      </div>
      <p className="mt-3 break-words text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl">{value}</p>
      {trend ? <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{trend}</p> : null}
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}
