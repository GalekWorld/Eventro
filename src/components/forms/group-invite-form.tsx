"use client";

import { useActionState } from "react";
import { inviteToGroupAction } from "@/app/actions/social";
import type { ActionState } from "@/lib/http";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: ActionState = {};

export function GroupInviteForm({ groupId }: { groupId: string }) {
  const [state, formAction] = useActionState(inviteToGroupAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-3xl bg-neutral-50 p-4">
      <input type="hidden" name="groupId" value={groupId} />
      <input name="username" className="app-input" placeholder="Invitar por username" />
      <SubmitButton className="app-button-secondary w-full" pendingText="Invitando...">
        Enviar invitación
      </SubmitButton>
      {state.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
    </form>
  );
}
