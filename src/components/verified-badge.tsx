import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({
  label = false,
  tone = "blue",
  className = "",
}: {
  label?: boolean;
  tone?: "blue" | "red";
  className?: string;
}) {
  const toneClassName = tone === "red" ? "text-rose-500" : "text-sky-500";

  return (
    <span className={`inline-flex items-center gap-1 ${toneClassName} ${className}`}>
      <BadgeCheck className="h-4 w-4 fill-current" />
      {label ? <span className="text-sm font-medium text-slate-700">Verificado</span> : null}
    </span>
  );
}
