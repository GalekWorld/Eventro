"use client";

import { useActionState } from "react";
import { sendPasswordResetEmailAction } from "@/app/actions/auth";
import type { ActionState } from "@/lib/http";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: ActionState = {};

export function PasswordResetRequestForm({ emailConfigured }: { emailConfigured: boolean }) {
  const [state, formAction] = useActionState(sendPasswordResetEmailAction, initialState);

  return (
    <form action={formAction} className="app-card p-5">
      <h2 className="text-lg font-semibold text-slate-950">Cambiar contraseña</h2>
      <p className="mt-2 text-sm text-slate-500">
        Te enviaremos un correo con un enlace seguro para cambiar tu contraseña. Al usarlo se cerrarán tus sesiones
        activas.
      </p>

      {!emailConfigured ? (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          El envío de correo aún no está configurado. Añade <code>RESEND_API_KEY</code> y <code>EMAIL_FROM</code> en
          tu <code>.env</code> para activarlo.
        </div>
      ) : null}

      {state.error ? <p className="mt-3 text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="mt-3 text-sm text-emerald-600">{state.success}</p> : null}

      <div className="mt-4">
        <SubmitButton className="app-button-secondary w-full sm:w-auto disabled:opacity-60" pendingText="Enviando correo...">
          Enviar correo de cambio
        </SubmitButton>
      </div>
    </form>
  );
}
