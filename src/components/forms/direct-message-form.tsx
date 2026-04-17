"use client";

import { useMemo, useState } from "react";
import { LoaderCircle, Plus, SendHorizonal, Sparkles } from "lucide-react";
import type { ActionState } from "@/lib/http";
import { sendDirectMessageAction } from "@/app/actions/social";
import { useRealtimeTopic } from "@/components/use-realtime-topic";

export function DirectMessageForm({
  conversationId,
  onMessageSent,
}: {
  conversationId: string;
  onMessageSent?: (message: { id: string; body: string; createdAt: string; senderId: string }) => void;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { send } = useRealtimeTopic(useMemo(() => [`conversation:${conversationId}`], [conversationId]));
  const canSend = body.trim().length > 0 && !isSubmitting;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedBody = body.trim();
    if (!trimmedBody || isSubmitting) {
      return;
    }

    const previousBody = body;
    const formData = new FormData();
    formData.set("conversationId", conversationId);
    formData.set("body", trimmedBody);

    setIsSubmitting(true);
    setError(null);
    setBody("");

    try {
      const result = await sendDirectMessageAction({} as ActionState, formData);

      if (result?.error) {
        setBody(previousBody);
        setError(result.error);
        return;
      }

      if (result?.data?.messageId && result.data.body && result.data.createdAt && result.data.senderId) {
        onMessageSent?.({
          id: String(result.data.messageId),
          body: String(result.data.body),
          createdAt: String(result.data.createdAt),
          senderId: String(result.data.senderId),
        });
      }
    } catch {
      setBody(previousBody);
      setError("No se pudo enviar el mensaje privado.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="chat-composer border-t border-neutral-200 p-3 sm:p-4">
      <div className="chat-composer-shell flex items-end gap-2 rounded-[28px] border border-white/50 bg-white/85 p-2 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-slate-500 hover:bg-neutral-200"
          aria-label="Más opciones"
        >
          <Plus className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <textarea
            name="body"
            className="min-h-[52px] w-full resize-none border-0 bg-transparent px-2 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            placeholder="Escribe algo..."
            value={body}
            onChange={(event) => {
              const nextValue = event.target.value;
              setBody(nextValue);
              if (nextValue.trim()) {
                send({ type: "typing", topic: `conversation:${conversationId}` });
              }
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Enviar mensaje"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow-[0_10px_30px_rgba(14,165,233,0.35)] disabled:opacity-50"
        >
          {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 px-2">
        <Sparkles className="h-3.5 w-3.5 text-slate-400" />
        <p className="text-[11px] text-slate-500">Privado activo en tiempo real.</p>
      </div>

      {error ? <p className="mt-2 px-2 text-sm text-red-500">{error}</p> : null}
    </form>
  );
}
