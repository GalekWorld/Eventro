"use client";

import { Camera, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): BarcodeDetectorLike;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

export function CameraQrScanner({
  onCodeDetected,
}: {
  onCodeDetected: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const lastCodeRef = useRef<string>("");
  const [status, setStatus] = useState<"idle" | "unsupported" | "denied" | "ready">("idle");

  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        return;
      }

      try {
        detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus("ready");

        const scan = async () => {
          if (!mounted || !videoRef.current || !detectorRef.current) {
            return;
          }

          try {
            const codes = await detectorRef.current.detect(videoRef.current);
            const value = codes.find((item) => item.rawValue)?.rawValue?.toUpperCase();

            if (value && value !== lastCodeRef.current) {
              lastCodeRef.current = value;
              onCodeDetected(value);
              navigator.vibrate?.(60);
              window.setTimeout(() => {
                if (lastCodeRef.current === value) {
                  lastCodeRef.current = "";
                }
              }, 1500);
            }
          } catch {
            // ignore single-frame read errors
          }

          frameRef.current = window.requestAnimationFrame(scan);
        };

        frameRef.current = window.requestAnimationFrame(scan);
      } catch {
        setStatus("denied");
      }
    }

    startScanner();

    return () => {
      mounted = false;

      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [onCodeDetected]);

  return (
    <div className="grid gap-3 rounded-[28px] border border-neutral-200 bg-white p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-slate-950">Escaneo con camara</h2>
        <p className="mt-1 text-sm text-slate-500">
          Usa la camara trasera del movil. En cuanto detecte un QR, rellenaremos el codigo automaticamente.
        </p>
      </div>

      {status === "ready" ? (
        <div className="relative overflow-hidden rounded-[24px] border border-neutral-200 bg-black">
          <video ref={videoRef} className="aspect-[3/4] w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-44 w-44 rounded-[32px] border-2 border-white/85 shadow-[0_0_0_9999px_rgba(15,23,42,0.28)]">
              <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.85)]" />
            </div>
          </div>
          <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white">
            <ScanLine className="h-3.5 w-3.5" />
            Buscando QR...
          </div>
        </div>
      ) : null}

      {status === "unsupported" ? (
        <p className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-slate-500">
          Este navegador no soporta escaneo automatico. Puedes usar el codigo manual justo debajo.
        </p>
      ) : null}

      {status === "denied" ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudo acceder a la camara. Revisa los permisos del navegador o usa el codigo manual.
        </p>
      ) : null}

      {status === "idle" ? (
        <p className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-slate-500">
          <Camera className="h-4 w-4" />
          Preparando camara...
        </p>
      ) : null}
    </div>
  );
}
