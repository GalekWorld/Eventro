"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/http";
import { createGroupAction } from "@/app/actions/social";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: ActionState = {};

export function GroupForm() {
  const [state, formAction] = useActionState(createGroupAction, initialState);

  return (
    <form action={formAction} className="app-card p-4">
      <div className="grid gap-3">
        <input name="name" className="app-input" placeholder="Nombre del grupo" />
        <select name="privacy" className="app-input">
          <option value="PUBLIC">Publico</option>
          <option value="PRIVATE">Privado</option>
        </select>
        <textarea
          name="description"
          className="app-textarea min-h-28"
          placeholder="Describe el objetivo del grupo"
        />
      </div>

      {state.error ? <p className="mt-3 text-sm text-red-500">{state.error}</p> : null}
      {state.success ? <p className="mt-3 text-sm text-green-600">{state.success}</p> : null}

      <div className="mt-4">
        <SubmitButton className="app-button-primary w-full disabled:opacity-60" pendingText="Creando grupo...">
          Crear grupo
        </SubmitButton>
      </div>
    </form>
  );
}
