"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/lib/http";
import { createStoryAction } from "@/app/actions/social";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: ActionState = {};
const MAX_UPLOAD_MB = 5;

export function StoryForm() {
  const [state, formAction] = useActionState(createStoryAction, initialState);
  const [fileError, setFileError] = useState("");
  const [durationSec, setDurationSec] = useState(10);
  const durationLabel = useMemo(() => `${durationSec}s`, [durationSec]);

  return (
    <form action={formAction} className="app-card rounded-[18px] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-950">Subir historia</p>
        <span className="text-xs text-slate-400">Máx. 15 s</span>
      </div>

      <div className="mt-4 grid gap-3">
        <input
          type="file"
          name="image"
          accept="image/png,image/jpeg,image/webp"
          className="text-sm text-slate-500 file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
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
        <input name="caption" className="app-input" placeholder="Texto corto para la historia" />

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-700">Duración</p>
            <span className="text-sm font-semibold text-slate-950">{durationLabel}</span>
          </div>
          <input
            type="range"
            name="durationSec"
            min={5}
            max={15}
            step={1}
            value={durationSec}
            onChange={(event) => setDurationSec(Number(event.currentTarget.value))}
            className="mt-3 w-full accent-sky-500"
          />
        </div>
      </div>

      {fileError ? <p className="mt-3 text-sm text-red-500">{fileError}</p> : null}
      {state.error ? <p className="mt-3 text-sm text-red-500">{state.error}</p> : null}
      {state.success ? <p className="mt-3 text-sm text-green-600">{state.success}</p> : null}

      <div className="mt-4">
        <SubmitButton className="app-button-primary w-full disabled:opacity-60" pendingText="Publicando historia...">
          Publicar historia
        </SubmitButton>
      </div>
    </form>
  );
}
