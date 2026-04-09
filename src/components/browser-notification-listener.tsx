"use client";

import { useEffect, useMemo } from "react";

type BrowserNotificationPayload = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
};

function getWebSocketUrl(topics: string[]) {
  const url = new URL("/ws", window.location.origin);

  for (const topic of topics) {
    url.searchParams.append("topic", topic);
  }

  return url.toString().replace(/^http/, "ws");
}

function rememberNotification(id: string) {
  try {
    const raw = window.sessionStorage.getItem("eventro:notified");
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    const next = [id, ...parsed.filter((item) => item !== id)].slice(0, 40);
    window.sessionStorage.setItem("eventro:notified", JSON.stringify(next));
  } catch {
    // ignore storage issues
  }
}

function hasSeenNotification(id: string) {
  try {
    const raw = window.sessionStorage.getItem("eventro:notified");
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return parsed.includes(id);
  } catch {
    return false;
  }
}

async function fetchNotification(notificationId: string) {
  const response = await fetch(`/api/notifications/${notificationId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as BrowserNotificationPayload;
}

export function BrowserNotificationListener({ userId }: { userId: string }) {
  const topics = useMemo(() => [`user:${userId}`], [userId]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      return;
    }

    if (Notification.permission !== "granted") {
      return;
    }

    const socket = new WebSocket(getWebSocketUrl(topics));

    socket.addEventListener("message", async (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as { type?: string; entityId?: string };

        if (payload.type !== "notification:new" || !payload.entityId) {
          return;
        }

        if (hasSeenNotification(payload.entityId)) {
          return;
        }

        const notification = await fetchNotification(payload.entityId);
        if (!notification) {
          return;
        }

        if (notification.type !== "FOLLOW" && notification.type !== "DIRECT_MESSAGE") {
          return;
        }

        rememberNotification(notification.id);

        const browserNotification = new Notification(notification.title, {
          body: notification.body ?? "",
          tag: notification.id,
        });

        browserNotification.onclick = () => {
          window.focus();
          if (notification.link) {
            window.location.href = notification.link;
          }
          browserNotification.close();
        };
      } catch {
        // ignore malformed payloads
      }
    });

    return () => {
      socket.close();
    };
  }, [topics]);

  return null;
}
