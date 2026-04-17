"use client";

import { useEffect, useRef } from "react";

export function LiveLocationSync({
  enabled,
}: {
  enabled: boolean;
}) {
  const lastSentAtRef = useRef(0);
  const lastCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  function getDistanceInMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
    const earthRadius = 6_371_000;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const deltaLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const deltaLng = ((b.longitude - a.longitude) * Math.PI) / 180;

    const haversine =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;

    let isCancelled = false;

    async function sendPosition(position: GeolocationPosition) {
      const latitude = Number(position.coords.latitude.toFixed(6));
      const longitude = Number(position.coords.longitude.toFixed(6));
      const nextCoords = { latitude, longitude };
      const now = Date.now();

      if (now - lastSentAtRef.current < 90_000) {
        return;
      }

      if (lastCoordsRef.current && getDistanceInMeters(lastCoordsRef.current, nextCoords) < 50) {
        return;
      }

      lastSentAtRef.current = now;
      lastCoordsRef.current = nextCoords;

      try {
        await fetch("/api/location", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nextCoords),
        });
      } catch {
        // Ignore sync errors and keep the UI responsive.
      }
    }

    function syncCurrentPosition() {
      if (document.visibilityState === "hidden") return;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (isCancelled) return;
          void sendPosition(position);
        },
        () => {
          // Ignore browser permission/location errors here.
        },
        {
          enableHighAccuracy: false,
          maximumAge: 180_000,
          timeout: 8_000,
        },
      );
    }

    syncCurrentPosition();

    const intervalId = window.setInterval(() => {
      syncCurrentPosition();
    }, 120_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncCurrentPosition();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled]);

  return null;
}
