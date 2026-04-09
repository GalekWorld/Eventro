"use client";

import { useEffect, useRef } from "react";

export function LiveLocationSync({
  enabled,
}: {
  enabled: boolean;
}) {
  const lastSentAtRef = useRef(0);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();
        if (now - lastSentAtRef.current < 20_000) {
          return;
        }

        lastSentAtRef.current = now;

        try {
          await fetch("/api/location", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              latitude: Number(position.coords.latitude.toFixed(6)),
              longitude: Number(position.coords.longitude.toFixed(6)),
            }),
          });
        } catch {
          // Ignore sync errors and keep the UI responsive.
        }
      },
      () => {
        // Ignore browser permission/location errors here.
      },
      {
        enableHighAccuracy: true,
        maximumAge: 20_000,
        timeout: 10_000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return null;
}
