"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TypingIndicator } from "@/components/typing-indicator";
import { DirectConversationThread } from "@/components/direct-conversation-thread";
import { DirectMessageForm } from "@/components/forms/direct-message-form";
import { useRealtimeTopic } from "@/components/use-realtime-topic";

type ClientMessage = {
  id: string;
  body: string;
  readAt: Date | string | null;
  createdAt: Date | string;
  sender: {
    id: string;
  };
};

export function DirectConversationClient({
  conversationId,
  currentUserId,
  currentUserRole,
  otherUserLabel,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  currentUserRole: string;
  otherUserLabel: string;
  initialMessages: ClientMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ClientMessage[]>(initialMessages);
  const { lastEvent } = useRealtimeTopic([`conversation:${conversationId}`]);

  function upsertMessage(message: {
    id: string;
    body: string;
    createdAt: string;
    senderId: string;
  }) {
    setMessages((current) => {
      if (current.some((entry) => entry.id === message.id)) {
        return current;
      }

      return [
        ...current,
        {
          id: message.id,
          body: message.body,
          createdAt: message.createdAt,
          readAt: null,
          sender: {
            id: message.senderId,
          },
        },
      ];
    });
  }

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === "conversation:message" && lastEvent.data?.messageId && lastEvent.data.body && lastEvent.data.createdAt && lastEvent.data.senderId) {
      upsertMessage({
        id: String(lastEvent.data.messageId),
        body: String(lastEvent.data.body),
        createdAt: String(lastEvent.data.createdAt),
        senderId: String(lastEvent.data.senderId),
      });
      return;
    }

    if (lastEvent.type === "conversation:message-delete" || lastEvent.type === "conversation:read") {
      router.refresh();
    }
  }, [lastEvent, router]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 1200);

    return () => window.clearInterval(interval);
  }, [router]);

  return (
    <>
      <DirectConversationThread messages={messages} currentUserId={currentUserId} currentUserRole={currentUserRole} />
      <TypingIndicator topic={`conversation:${conversationId}`} actorId={currentUserId} label={otherUserLabel} />
      <DirectMessageForm conversationId={conversationId} onMessageSent={upsertMessage} />
    </>
  );
}
