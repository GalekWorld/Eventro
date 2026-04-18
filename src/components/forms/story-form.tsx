"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/lib/http";
import { createStoryAction } from "@/app/actions/social";
import { SubmitButton } from "@/components/forms/submit-button";
import { normalizeStoryImage, storyImageConfig } from "@/components/forms/story-image";

const initialState: ActionState = {};

export function StoryForm() {
  const [state, formAction] = useActionState(createStoryAction, initialState);
  const [fileError, setFileError] = useState("");
  const [fileInfo, setFileInfo] = useState("");
  const [durationSec, setDurationSec] = useState(10);
  const [normalizedImage, setNormalizedImage] = useState<File | null>(null);
  const durationLabel = useMemo(() => `${durationSec}s`, [durationSec]);

  return (
    <form
      action={async (formData) => {
        if (normalizedImage) {
          formData.set("image", normalizedImage);
        }
        await formAction(formData);
      }}
      encType="multipart/form-data"
      className="app-card rounded-[18px] p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-950">Subir historia</p>
        <span className="text-xs text-slate-400">Max. 15 s</span>
      </div>

      <div className="mt-4 grid gap-3">
        <input
          type="file"
          name="image"
          accept="image/png,image/jpeg,image/webp"
          className="text-sm text-slate-500 file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
          onChange={async (event) => {
            const file = event.currentTarget.files?.[0];
            setNormalizedImage(null);
            setFileInfo("");

            if (!file) {
              setFileError("");
              return;
            }

            if (file.size > storyImageConfig.maxUploadMb * 1024 * 1024) {
              setFileError(`La imagen supera ${storyImageConfig.maxUploadMb} MB. Elige una mas ligera.`);
              event.currentTarget.value = "";
              return;
            }

            try {
              const normalized = await normalizeStoryImage(file);
              setNormalizedImage(normalized);
              setFileError("");
              setFileInfo(`Eventro ajustara la foto automaticamente a ${storyImageConfig.width}x${storyImageConfig.height} antes de subirla.`);
            } catch (error) {
              setFileError(error instanceof Error ? error.message : "No se pudo preparar la imagen.");
              event.currentTarget.value = "";
            }
          }}
        />
        <input name="caption" className="app-input" placeholder="Texto corto para la historia" />

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-700">Duracion</p>
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
      {fileInfo ? <p className="mt-3 text-sm text-sky-600">{fileInfo}</p> : null}
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
