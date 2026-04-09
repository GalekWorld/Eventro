"use client";

import { useActionState } from "react";
import { resetPasswordWithTokenAction } from "@/app/actions/auth";
import type { ActionState } from "@/lib/http";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: ActionState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordWithTokenAction, initialState);

  return (
    <form action={formAction} className="app-card p-5 sm:p-6">
      <input type="hidden" name="token" value={token} />

      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Nueva contraseña</h1>
        <p className="mt-2 text-sm text-slate-500">Introduce tu nueva contraseña y confirma el cambio.</p>
      </div>

      <div className="mt-5 grid gap-3">
        <input type="password" name="password" className="app-input" placeholder="Nueva contraseña" minLength={8} required />
        <input type="password" name="confirmPassword" className="app-input" placeholder="Repite la nueva contraseña" minLength={8} required />
      </div>

      {state.error ? <p className="mt-3 text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="mt-3 text-sm text-emerald-600">{state.success}</p> : null}

      <div className="mt-5">
        <SubmitButton className="app-button-primary w-full disabled:opacity-60" pendingText="Actualizando...">
          Guardar nueva contraseña
        </SubmitButton>
      </div>
    </form>
  );
}
