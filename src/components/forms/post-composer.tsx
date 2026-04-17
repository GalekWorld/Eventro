"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/http";
import { createPostAction } from "@/app/actions/social";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: ActionState = {};
const MAX_UPLOAD_MB = 5;

export function PostComposer() {
  const [state, formAction] = useActionState(createPostAction, initialState);
  const [fileError, setFileError] = useState("");

  return (
    <form action={formAction} encType="multipart/form-data" className="app-card rounded-[18px] p-3 sm:p-4">
      <textarea name="content" className="app-textarea min-h-[96px] w-full text-sm" placeholder="¿Qué te apetece compartir hoy?" />

      <input
        name="location"
        className="app-input mt-3"
        placeholder="Ubicación opcional, por ejemplo: Teatro Barceló, Madrid"
        maxLength={120}
      />

      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <input
          type="file"
          name="image"
          accept="image/png,image/jpeg,image/webp"
          className="w-full text-sm text-slate-500 file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file && file.size > MAX_UPLOAD_MB * 1024 * 1024) {
              setFileError(`La imagen supera ${MAX_UPLOAD_MB} MB. Elige una más ligera.`);
              event.currentTarget.value = "";
            } else {
              setFileError("");
            }
          }}
        />

        <label className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-slate-700">
          <input type="checkbox" name="showOnProfile" defaultChecked className="h-4 w-4 rounded border-neutral-300 text-sky-500 focus:ring-sky-400" />
          <span>Guardar en perfil</span>
        </label>
      </div>

      <div className="mt-3 flex items-center justify-end">
        <SubmitButton className="app-button-primary w-full sm:w-auto disabled:opacity-60" pendingText="Publicando...">
          Publicar
        </SubmitButton>
      </div>

      {fileError ? <p className="mt-3 text-sm text-red-500">{fileError}</p> : null}
      {state.error ? <p className="mt-3 text-sm text-red-500">{state.error}</p> : null}
      {state.success ? <p className="mt-3 text-sm text-green-600">{state.success}</p> : null}
    </form>
  );
}
