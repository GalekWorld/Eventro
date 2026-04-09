"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/http";
import { addDoorStaffAction } from "@/app/actions/local";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: ActionState = {};

export function DoorStaffForm({ eventId }: { eventId?: string }) {
  const [state, formAction] = useActionState(addDoorStaffAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[28px] border border-neutral-200 bg-white p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-slate-950">Añadir portero</h2>
        <p className="mt-1 text-sm text-slate-500">
          Añade por username a quien podrá escanear entradas de este local{eventId ? " o de este evento" : ""}.
        </p>
      </div>

      {eventId ? <input type="hidden" name="eventId" value={eventId} /> : null}
      <input name="username" className="app-input" placeholder="username del portero" />

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      <SubmitButton className="app-button-primary w-full disabled:opacity-60" pendingText="Guardando...">
        Dar acceso
      </SubmitButton>
    </form>
  );
}
