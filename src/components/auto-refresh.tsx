"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    let intervalId: number | null = null;

    const start = () => {
      if (intervalId != null) return;

      intervalId = window.setInterval(() => {
        if (document.hidden || !navigator.onLine) {
          return;
        }

        router.refresh();
      }, intervalMs);
    };

    const stop = () => {
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const sync = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("online", sync);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("online", sync);
    };
  }, [intervalMs, router]);

  return null;
}
