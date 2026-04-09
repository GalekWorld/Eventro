"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/lib/http";
import { sendEventChatMessageAction } from "@/app/actions/social";
import { SubmitButton } from "@/components/forms/submit-button";
import { useRealtimeTopic } from "@/components/use-realtime-topic";

const initialState: ActionState = {};

export function EventChatForm({ eventId }: { eventId: string }) {
  const [state, formAction] = useActionState(sendEventChatMessageAction, initialState);
  const [body, setBody] = useState("");
  const { send } = useRealtimeTopic(useMemo(() => [`event:${eventId}`], [eventId]));

  return (
    <form action={formAction} className="border-t border-neutral-200 p-4">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="flex items-end gap-3">
        <textarea
          name="body"
          className="app-textarea min-h-[52px] flex-1 resize-none"
          placeholder="Habla con la gente que va al evento..."
          value={body}
          onChange={(event) => {
            const nextValue = event.target.value;
            setBody(nextValue);
            if (nextValue.trim()) {
              send({ type: "typing", topic: `event:${eventId}` });
            }
          }}
        />
        <SubmitButton className="app-button-primary disabled:opacity-60" pendingText="Enviando...">
          Enviar
        </SubmitButton>
      </div>
      {state.error ? <p className="mt-2 text-sm text-red-500">{state.error}</p> : null}
      {state.success ? <p className="mt-2 text-sm text-green-600">{state.success}</p> : null}
    </form>
  );
}
