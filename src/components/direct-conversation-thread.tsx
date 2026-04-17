"use client";

import { useEffect, useMemo, useRef } from "react";
import { Check, CheckCheck } from "lucide-react";
import { MessageActions } from "@/components/message-actions";

type ThreadMessage = {
  id: string;
  body: string;
  readAt: Date | string | null;
  createdAt: Date | string;
  sender: {
    id: string;
  };
};

function getMessageDayLabel(value: Date | string) {
  return new Date(value).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

export function DirectConversationThread({
  messages,
  currentUserId,
  currentUserRole,
}: {
  messages: ThreadMessage[];
  currentUserId: string;
  currentUserRole: string;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: mountedRef.current ? "smooth" : "auto",
      block: "end",
    });
    mountedRef.current = true;
  }, [messages.length]);

  const renderedMessages = useMemo(
    () =>
      messages.map((message, index) => {
        const mine = message.sender.id === currentUserId;
        const canDelete = mine || currentUserRole === "ADMIN";
        const timestamp = new Date(message.createdAt).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const previous = messages[index - 1];
        const startsGroup = !previous || previous.sender.id !== message.sender.id;
        const dayLabel = getMessageDayLabel(message.createdAt);
        const previousDayLabel = previous ? getMessageDayLabel(previous.createdAt) : null;

        return {
          ...message,
          mine,
          canDelete,
          timestamp,
          startsGroup,
          showDayDivider: dayLabel !== previousDayLabel,
          dayLabel,
        };
      }),
    [currentUserId, currentUserRole, messages],
  );

  return (
    <div className="chat-thread max-h-[63svh] overflow-y-auto px-3 py-4 sm:max-h-[66vh] sm:px-4">
      {renderedMessages.length === 0 ? (
        <div className="mx-auto max-w-sm rounded-[28px] border border-dashed border-neutral-300 bg-white/70 p-6 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur">
          <p className="text-base font-semibold text-slate-950">La conversación está abierta</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Envía el primer mensaje y rompe el hielo. Aquí aparecerán vuestros mensajes en tiempo real.
          </p>
        </div>
      ) : null}

      <div className="space-y-1">
        {renderedMessages.map((message) => (
          <div key={message.id}>
            {message.showDayDivider ? (
              <div className="flex justify-center py-4">
                <span className="rounded-full border border-white/50 bg-white/75 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm backdrop-blur">
                  {message.dayLabel}
                </span>
              </div>
            ) : null}

            <div className={`flex ${message.mine ? "justify-end" : "justify-start"} ${message.startsGroup ? "mt-2" : "mt-1"}`}>
              <div
                className={`chat-bubble max-w-[88%] rounded-[26px] px-4 py-3 sm:max-w-[78%] ${
                  message.mine ? "chat-bubble-mine" : "chat-bubble-other"
                }`}
              >
                <p className={`break-words text-[14px] leading-6 ${message.mine ? "text-white" : "text-slate-800"}`}>{message.body}</p>

                <div
                  className={`mt-2 flex items-center justify-end gap-1.5 text-[11px] ${
                    message.mine ? "text-white/75" : "text-slate-400"
                  }`}
                >
                  <span>{message.timestamp}</span>
                  {message.mine ? (
                    message.readAt ? (
                      <CheckCheck className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    )
                  ) : null}
                </div>

                {message.canDelete ? <MessageActions kind="direct" id={message.id} mine={message.mine} /> : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div ref={bottomRef} />
    </div>
  );
}
