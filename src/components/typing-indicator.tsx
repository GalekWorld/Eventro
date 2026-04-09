"use client";

import { useEffect, useState } from "react";
import { useRealtimeTopic } from "@/components/use-realtime-topic";

export function TypingIndicator({
  topic,
  actorId,
  label,
}: {
  topic: string;
  actorId: string;
  label: string;
}) {
  const { lastEvent } = useRealtimeTopic([topic]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (lastEvent?.type !== "typing" || lastEvent.topic !== topic || lastEvent.actorId === actorId) {
      return;
    }

    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [actorId, lastEvent, topic]);

  if (!visible) return null;

  return (
    <div className="px-4 pb-2">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm backdrop-blur">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400 [animation-delay:120ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-300 [animation-delay:240ms]" />
        </span>
        {label} está escribiendo...
      </div>
    </div>
  );
}
