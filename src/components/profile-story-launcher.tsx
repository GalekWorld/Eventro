"use client";

import type { ReactNode } from "react";
import { useRef, useState, useTransition } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { normalizeStoryImage, storyImageConfig } from "@/components/forms/story-image";

type ProfileStoryLauncherProps = {
  children: ReactNode;
  className?: string;
};

export function ProfileStoryLauncher({ children, className = "" }: ProfileStoryLauncherProps) {
  const router = useRouter();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function openPicker(type: "gallery" | "camera") {
    setIsOpen(false);

    if (type === "camera") {
      cameraInputRef.current?.click();
      return;
    }

    galleryInputRef.current?.click();
  }

  function handleFileSelection(file: File | null, reset: () => void) {
    if (!file) {
      return;
    }

    if (file.size > storyImageConfig.maxUploadMb * 1024 * 1024) {
      setError(`La imagen supera ${storyImageConfig.maxUploadMb} MB. Elige una mas ligera.`);
      setMessage("");
      reset();
      return;
    }

    startTransition(async () => {
      try {
        const normalized = await normalizeStoryImage(file);
        const formData = new FormData();
        formData.set("image", normalized);
        formData.set("caption", "");
        formData.set("durationSec", "10");

        const response = await fetch("/api/stories", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as { error?: string; success?: string };

        if (!response.ok || result.error) {
          setError(result.error ?? "No se pudo publicar la historia.");
          setMessage("");
        } else {
          setError("");
          setMessage(result.success ?? "Historia subida. Ya la tienes activa.");
          router.refresh();
        }
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "No se pudo preparar la historia.");
        setMessage("");
      } finally {
        reset();
      }
    });
  }

  return (
    <div className={className}>
      <div className="relative">
        {children}
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          disabled={isPending}
          className="absolute inset-0 rounded-full"
          aria-label="Subir historia"
        >
          <span className="sr-only">Subir historia</span>
        </button>

        {isOpen ? (
          <div className="absolute left-1/2 top-full z-20 mt-3 w-[220px] -translate-x-1/2 rounded-3xl border border-neutral-200 bg-white p-3 shadow-xl">
            <p className="px-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Historia</p>
            <div className="mt-2 grid gap-2">
              <button
                type="button"
                onClick={() => openPicker("gallery")}
                className="flex items-center justify-between rounded-2xl bg-neutral-50 px-3 py-3 text-sm font-medium text-slate-800 transition hover:bg-neutral-100"
              >
                <span>Elegir de galeria</span>
                <ImagePlus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => openPicker("camera")}
                className="flex items-center justify-between rounded-2xl bg-sky-50 px-3 py-3 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
              >
                <span>Tomar foto</span>
                <Camera className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/*"
          className="hidden"
          onChange={(event) =>
            handleFileSelection(event.currentTarget.files?.[0] ?? null, () => {
              event.currentTarget.value = "";
            })
          }
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/*"
          capture="environment"
          className="hidden"
          onChange={(event) =>
            handleFileSelection(event.currentTarget.files?.[0] ?? null, () => {
              event.currentTarget.value = "";
            })
          }
        />
      </div>

      {isPending ? <p className="mt-3 text-center text-xs text-sky-600">Preparando historia...</p> : null}
      {message ? <p className="mt-3 text-center text-xs text-green-600">{message}</p> : null}
      {error ? <p className="mt-3 text-center text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
