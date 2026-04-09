"use client";

import { useActionState } from "react";
import { reportContentAction, reportUserAction } from "@/app/actions/social";
import type { ActionState } from "@/lib/http";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: ActionState = {};

export function ReportForm({
  mode,
  targetField,
  targetId,
}: {
  mode: "content" | "user";
  targetField: string;
  targetId: string;
}) {
  const action = mode === "user" ? reportUserAction : reportContentAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-medium text-slate-500">Reportar</summary>
      <form action={formAction} className="mt-2 space-y-2 rounded-2xl bg-neutral-50 p-3">
        <input type="hidden" name={targetField} value={targetId} />
        <textarea name="reason" className="app-textarea min-h-20" placeholder="Motivo del reporte" />
        <SubmitButton className="app-button-secondary" pendingText="Enviando...">
          Enviar reporte
        </SubmitButton>
        {state.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
      </form>
    </details>
  );
}
