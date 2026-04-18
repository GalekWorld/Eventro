"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/lib/http";
import { createStoryAction } from "@/app/actions/social";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: ActionState = {};
const MAX_UPLOAD_MB = 5;
const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const OUTPUT_MIME = "image/webp";

function getNormalizedImageType(blob: Blob) {
  if (blob.type === "image/png" || blob.type === "image/jpeg" || blob.type === "image/webp") {
    return blob.type;
  }

  return OUTPUT_MIME;
}

function getImageExtension(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  return "webp";
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo preparar la imagen."));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

async function normalizeStoryImage(file: File) {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo preparar la imagen.");
  }

  const scale = Math.max(STORY_WIDTH / image.width, STORY_HEIGHT / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (STORY_WIDTH - drawWidth) / 2;
  const offsetY = (STORY_HEIGHT - drawHeight) / 2;

  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const blob = await canvasToBlob(canvas, OUTPUT_MIME, 0.92);
  const normalizedType = getNormalizedImageType(blob);
  const baseName = file.name.replace(/\.[^.]+$/, "") || "story";

  return new File([blob], `${baseName}.${getImageExtension(normalizedType)}`, {
    type: normalizedType,
    lastModified: Date.now(),
  });
}

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

            if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
              setFileError(`La imagen supera ${MAX_UPLOAD_MB} MB. Elige una mas ligera.`);
              event.currentTarget.value = "";
              return;
            }

            try {
              const normalized = await normalizeStoryImage(file);
              setNormalizedImage(normalized);
              setFileError("");
              setFileInfo(`Eventro ajustara la foto automaticamente a ${STORY_WIDTH}x${STORY_HEIGHT} antes de subirla.`);
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
