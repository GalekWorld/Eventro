"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/http";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: ActionState = {};

export function AuthForm({
  title,
  description,
  action,
  submitLabel,
  pendingLabel,
  showDisplayName = false,
}: {
  title: string;
  description?: string;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  pendingLabel: string;
  showDisplayName?: boolean;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        {description ? <p className="text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>

      <div className="space-y-3">
        {showDisplayName ? <input name="displayName" className="app-input" placeholder="Tu nombre" autoComplete="name" /> : null}
        <input name="email" className="app-input" type="email" placeholder="Email" autoComplete="email" />
        <input
          name="password"
          className="app-input"
          type="password"
          placeholder="Contraseña"
          autoComplete={showDisplayName ? "new-password" : "current-password"}
        />
      </div>

      {state.error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{state.error}</p> : null}
      {state.success ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{state.success}</p>
      ) : null}

      <SubmitButton className="app-button-primary w-full disabled:opacity-60" pendingText={pendingLabel}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
