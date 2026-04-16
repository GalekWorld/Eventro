"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function MapLocationButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleClick() {
    setError("");

    if (!navigator.geolocation) {
      setError("Tu navegador no permite obtener ubicacion.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch("/api/location", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              latitude: Number(position.coords.latitude.toFixed(6)),
              longitude: Number(position.coords.longitude.toFixed(6)),
            }),
          });

          if (!response.ok) {
            const data = (await response.json().catch(() => null)) as { error?: string } | null;

            if (data?.error === "LOCATION_DISABLED") {
              setError("Activa primero la ubicacion aproximada o exacta en tu perfil para usar el mapa.");
              return;
            }

            if (data?.error === "LOCATION_NOT_ALLOWED") {
              setError("Los perfiles de local usan una ubicacion fija configurada desde el perfil privado.");
              return;
            }

            setError("No se pudo guardar tu ubicacion exacta.");
            return;
          }

          startTransition(() => {
            router.refresh();
          });
        } catch {
          setError("No se pudo guardar tu ubicacion exacta.");
        }
      },
      () => {
        setError("Activa el permiso de ubicacion del navegador para continuar.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <button type="button" onClick={handleClick} className="app-button-primary" disabled={isPending}>
        {isPending ? "Actualizando..." : "Usar mi ubicacion exacta"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
