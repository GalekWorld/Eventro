"use client";

import { useMemo, useState } from "react";
import { RealMap, type RealMapPoint } from "@/components/real-map";

export function MapView({
  center,
  points,
}: {
  center: { latitude: number; longitude: number };
  points: RealMapPoint[];
}) {
  const [showFriends, setShowFriends] = useState(true);
  const [showVenues, setShowVenues] = useState(true);

  const filteredPoints = useMemo(
    () =>
      points.filter((point) => {
        if (point.type === "me") return true;
        if (point.type === "friend") return showFriends;
        if (point.type === "venue") return showVenues;
        return false;
      }),
    [points, showFriends, showVenues],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          className={showFriends ? "app-button-primary" : "app-button-secondary"}
          type="button"
          onClick={() => setShowFriends((value) => !value)}
        >
          Amigos ({points.filter((point) => point.type === "friend").length})
        </button>
        <button
          className={showVenues ? "app-button-primary" : "app-button-secondary"}
          type="button"
          onClick={() => setShowVenues((value) => !value)}
        >
          Locales ({points.filter((point) => point.type === "venue").length})
        </button>
      </div>

      <RealMap center={center} points={filteredPoints} heightClassName="h-[58svh] min-h-[400px] sm:h-[68vh]" />
    </div>
  );
}
