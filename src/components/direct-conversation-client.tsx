"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { markDirectConversationReadAction } from "@/app/actions/social";
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
  const [messages, setMessages] = useState<ClientMessage[]>(initialMessages);
  const { lastEvent } = useRealtimeTopic(useMemo(() => [`conversation:${conversationId}`], [conversationId]));
  const lastMarkedMessageIdRef = useRef<string | null>(null);

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

  function removeMessage(messageId: string) {
    setMessages((current) => current.filter((entry) => entry.id !== messageId));
  }

  const markOutgoingAsRead = useCallback(() => {
    setMessages((current) =>
      current.map((entry) =>
        entry.sender.id === currentUserId && entry.readAt == null
          ? {
              ...entry,
              readAt: new Date().toISOString(),
            }
          : entry,
        ),
    );
  }, [currentUserId]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const latestUnreadFromOtherUser = [...messages]
      .reverse()
      .find((message) => message.sender.id !== currentUserId && message.readAt == null);

    if (!latestUnreadFromOtherUser) {
      return;
    }

    if (lastMarkedMessageIdRef.current === latestUnreadFromOtherUser.id) {
      return;
    }

    lastMarkedMessageIdRef.current = latestUnreadFromOtherUser.id;
    void markDirectConversationReadAction(conversationId);
  }, [conversationId, currentUserId, messages]);

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

    if (lastEvent.type === "conversation:message-delete" && lastEvent.entityId) {
      removeMessage(String(lastEvent.entityId));
      return;
    }

    if (lastEvent.type === "conversation:read" && lastEvent.actorId && lastEvent.actorId !== currentUserId) {
      markOutgoingAsRead();
      return;
    }
  }, [currentUserId, lastEvent, markOutgoingAsRead]);

  return (
    <>
      <DirectConversationThread messages={messages} currentUserId={currentUserId} currentUserRole={currentUserRole} />
      <TypingIndicator topic={`conversation:${conversationId}`} actorId={currentUserId} label={otherUserLabel} />
      <DirectMessageForm conversationId={conversationId} onMessageSent={upsertMessage} />
    </>
  );
}
