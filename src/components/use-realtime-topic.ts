"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type TopicRealtimeEvent = {
  type: string;
  topic?: string;
  actorId?: string;
  entityId?: string;
  data?: Record<string, string | number | boolean | null>;
  at: number;
};

function buildWebsocketUrl(topics: string[]) {
  const url = new URL("/ws", window.location.origin);
  for (const topic of topics) {
    url.searchParams.append("topic", topic);
  }
  return url.toString().replace(/^http/, "ws");
}

export function useRealtimeTopic(topics: string[]) {
  const [lastEvent, setLastEvent] = useState<TopicRealtimeEvent | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const topicsKey = useMemo(() => topics.join("|"), [topics]);

  useEffect(() => {
    if (!topics.length) return;

    const socket = new WebSocket(buildWebsocketUrl(topics));
    socketRef.current = socket;

    socket.addEventListener("message", (event) => {
      try {
        setLastEvent(JSON.parse(String(event.data)) as TopicRealtimeEvent);
      } catch {
        // ignore malformed messages
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [topicsKey, topics]);

  function send(payload: Record<string, string>) {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify(payload));
  }

  return {
    lastEvent,
    send,
  };
}
