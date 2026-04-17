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

    const clearQueuedRefresh = () => {
      if (refreshTimeout != null) {
        window.clearTimeout(refreshTimeout);
        refreshTimeout = null;
      }
    };

    const clearFallback = () => {
      if (fallbackInterval != null) {
        window.clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    };

    const queueRefresh = () => {
      if (document.hidden) {
        return;
      }

      clearQueuedRefresh();
      refreshTimeout = window.setTimeout(() => {
        if (!document.hidden && navigator.onLine) {
          router.refresh();
        }
      }, 180);
    };

    const startFallback = () => {
      if (fallbackInterval != null || document.hidden) return;

      fallbackInterval = window.setInterval(() => {
        if (!document.hidden && navigator.onLine) {
          router.refresh();
        }
      }, fallbackIntervalMs);
    };

    const disconnect = () => {
      socket?.close();
      socket = null;
      clearFallback();
      clearQueuedRefresh();
    };

    const connect = () => {
      if (document.hidden) return;

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

    const handleVisibilityChange = () => {
      if (document.hidden) {
        disconnect();
        return;
      }

      connect();
    };

    connect();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleVisibilityChange);

    return () => {
      closedByApp = true;
      disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleVisibilityChange);
    };
  }, [fallbackIntervalMs, router, topics, topicsKey]);

  return null;
}
