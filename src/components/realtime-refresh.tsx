"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

function getWebSocketUrl(topics: string[]) {
  const url = new URL("/ws", window.location.origin);

  for (const topic of topics) {
    url.searchParams.append("topic", topic);
  }

  return url.toString().replace(/^http/, "ws");
}

function shouldUseWebSocketTransport() {
  return process.env.NEXT_PUBLIC_REALTIME_MODE !== "polling";
}

export function RealtimeRefresh({
  topics,
  fallbackIntervalMs = 15000,
}: {
  topics: string[];
  fallbackIntervalMs?: number;
}) {
  const router = useRouter();
  const topicsKey = useMemo(() => topics.join("|"), [topics]);

  useEffect(() => {
    if (typeof window === "undefined" || topics.length === 0) {
      return;
    }

    let socket: WebSocket | null = null;
    let refreshTimeout: number | null = null;
    let fallbackInterval: number | null = null;
    let closedByApp = false;

    const clearFallback = () => {
      if (fallbackInterval != null) {
        window.clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    };

    const startFallback = () => {
      if (fallbackInterval != null) return;

      fallbackInterval = window.setInterval(() => {
        router.refresh();
      }, fallbackIntervalMs);
    };

    const queueRefresh = () => {
      if (refreshTimeout != null) {
        window.clearTimeout(refreshTimeout);
      }

      refreshTimeout = window.setTimeout(() => {
        router.refresh();
      }, 180);
    };

    const connect = () => {
      if (!shouldUseWebSocketTransport()) {
        startFallback();
        return;
      }

      socket = new WebSocket(getWebSocketUrl(topics));

      socket.addEventListener("open", () => {
        clearFallback();
      });

      socket.addEventListener("message", () => {
        queueRefresh();
      });

      socket.addEventListener("close", () => {
        if (!closedByApp) {
          startFallback();
        }
      });

      socket.addEventListener("error", () => {
        socket?.close();
      });
    };

    connect();

    return () => {
      closedByApp = true;

      if (refreshTimeout != null) {
        window.clearTimeout(refreshTimeout);
      }

      clearFallback();
      socket?.close();
    };
  }, [fallbackIntervalMs, router, topics, topicsKey]);

  return null;
}
