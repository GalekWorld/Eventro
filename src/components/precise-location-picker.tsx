"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, LocateFixed, MapPinned, Search } from "lucide-react";

const RealMap = dynamic(() => import("@/components/real-map").then((mod) => mod.RealMap), {
  ssr: false,
});

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
};

type PickerMode = "user" | "venue";

export function PreciseLocationPicker({
  mode = "venue",
  latitudeName = "latitude",
  longitudeName = "longitude",
  latitudeDefault,
  longitudeDefault,
  addressName,
  addressDefault,
  searchQuery,
  helperText,
}: {
  mode?: PickerMode;
  latitudeName?: string;
  longitudeName?: string;
  latitudeDefault?: number | null;
  longitudeDefault?: number | null;
  addressName?: string;
  addressDefault?: string;
  searchQuery?: string;
  helperText?: string;
}) {
  const [latitude, setLatitude] = useState(latitudeDefault?.toString() ?? "");
  const [longitude, setLongitude] = useState(longitudeDefault?.toString() ?? "");
  const [status, setStatus] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchText, setSearchText] = useState(searchQuery ?? addressDefault ?? "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedAddress, setSelectedAddress] = useState(addressDefault ?? "");

  useEffect(() => {
    setLatitude(latitudeDefault?.toString() ?? "");
  }, [latitudeDefault]);

  useEffect(() => {
    setLongitude(longitudeDefault?.toString() ?? "");
  }, [longitudeDefault]);

  useEffect(() => {
    if (mode !== "user" || !navigator.geolocation) {
      return;
    }

    let cancelled = false;
    setStatus("Buscando tu ubicación actual...");

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (cancelled) return;
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setStatus("Tu ubicación se está actualizando automáticamente.");
      },
      () => {
        if (cancelled) return;
        setStatus("No se ha podido obtener tu ubicación. Revisa el permiso del navegador.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15000,
      },
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [mode]);

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  const hasCoordinates = Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);

  const mapPoints = useMemo(
    () =>
      hasCoordinates
        ? [
            {
              id: "selected",
              label: mode === "venue" ? "Local seleccionado" : "Tu posición actual",
              subtitle:
                mode === "venue"
                  ? selectedAddress || "Punto exacto seleccionado para el local"
                  : "Ubicación actual usada para tu perfil y el mapa",
              latitude: parsedLatitude,
              longitude: parsedLongitude,
              type: "me" as const,
            },
          ]
        : [],
    [hasCoordinates, mode, parsedLatitude, parsedLongitude, selectedAddress],
  );

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setStatus("Tu navegador no permite usar geolocalización.");
      return;
    }

    setStatus(mode === "venue" ? "Buscando ubicación para este local..." : "Buscando tu ubicación actual...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        if (mode === "venue" && !selectedAddress) {
          setSelectedAddress("Ubicación marcada desde tu posición actual");
        }
        setStatus(mode === "venue" ? "Ubicación del local guardada en el mapa." : "Ubicación actual detectada.");
      },
      () => {
        setStatus(mode === "venue" ? "No se pudo obtener la ubicación del local." : "No se pudo obtener tu ubicación.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  async function searchAddress() {
    const query = searchText.trim() || searchQuery?.trim();

    if (!query) {
      setStatus("Escribe una calle o una dirección para buscarla.");
      return;
    }

    setSearching(true);
    setStatus("Buscando dirección...");
    setResults([]);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("No se pudo buscar la dirección.");
      }

      const nextResults = (await response.json()) as SearchResult[];

      if (!nextResults.length) {
        setStatus("No se ha encontrado esa dirección.");
        return;
      }

      setResults(nextResults);
      setStatus("Elige la dirección correcta en la lista.");
    } catch {
      setStatus("No se pudo localizar esa dirección.");
    } finally {
      setSearching(false);
    }
  }

  function selectSearchResult(result: SearchResult) {
    setLatitude(Number(result.lat).toFixed(6));
    setLongitude(Number(result.lon).toFixed(6));
    setSelectedAddress(result.display_name);
    setSearchText(result.display_name);
    setResults([]);
    setStatus("Dirección confirmada en el mapa.");
  }

  return (
    <div className="grid gap-3">
      <input type="hidden" name={latitudeName} value={latitude} />
      <input type="hidden" name={longitudeName} value={longitude} />
      {addressName ? <input type="hidden" name={addressName} value={selectedAddress} /> : null}

      {mode === "user" ? (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
              <LocateFixed className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">Ubicación automática</p>
              <p className="mt-1 text-sm text-slate-500">
                Tu ubicación actual se detecta al momento y se actualiza automáticamente para el mapa social.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className="app-button-secondary" onClick={useCurrentLocation}>
              Actualizar ahora
            </button>
            {hasCoordinates ? (
              <span className="app-pill">
                {parsedLatitude.toFixed(4)}, {parsedLongitude.toFixed(4)}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                <MapPinned className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">Dirección del local</p>
                <p className="mt-1 text-sm text-slate-500">
                  Busca la calle exacta del local y confirma el punto en el mapa para asegurarte de que coincide con el sitio correcto.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <input
                className="app-input"
                placeholder="Busca calle, número, ciudad..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
              <button type="button" className="app-button-secondary" onClick={searchAddress} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {searching ? "Buscando" : "Buscar"}
              </button>
              <button type="button" className="app-button-secondary" onClick={useCurrentLocation}>
                Usar mapa actual
              </button>
            </div>

            {results.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {results.map((result) => (
                  <button
                    key={`${result.lat}-${result.lon}-${result.display_name}`}
                    type="button"
                    onClick={() => selectSearchResult(result)}
                    className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-neutral-50"
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            ) : null}

            {selectedAddress ? (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Dirección seleccionada: {selectedAddress}
              </div>
            ) : null}
          </div>
        </>
      )}

      {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
      {status ? <p className="text-sm text-slate-500">{status}</p> : null}

      {hasCoordinates ? (
        <RealMap
          center={{ latitude: parsedLatitude, longitude: parsedLongitude }}
          points={mapPoints}
          heightClassName="h-72"
          zoom={16}
        />
      ) : null}
    </div>
  );
}
