"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/http";
import { updateProfileAction } from "@/app/actions/social";
import { CitySelect } from "@/components/forms/city-select";
import { SubmitButton } from "@/components/forms/submit-button";
import { LocationFields } from "@/components/forms/location-fields";
import type { VenueHoursDay } from "@/lib/venue-hours";

const initialState: ActionState = {};

export function ProfileForm({
  defaults,
  usernameChangesRemaining = 3,
  isVenue = false,
}: {
  defaults: {
    name?: string | null;
    username?: string | null;
    bio?: string | null;
    city?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    locationAddress?: string | null;
    shareLocation?: boolean;
    locationSharingMode?: "GHOST" | "APPROXIMATE" | "EXACT" | null;
    venueHours?: VenueHoursDay[];
  };
  usernameChangesRemaining?: number;
  isVenue?: boolean;
}) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);
  const venueHours = defaults.venueHours ?? [];

  return (
    <form action={formAction} encType="multipart/form-data" className="app-card p-5">
      <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Editar perfil</p>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-2 text-sm text-slate-600">
          <span>Foto de perfil</span>
          <input
            type="file"
            name="avatar"
            accept="image/png,image/jpeg,image/webp"
            className="text-sm text-slate-500 file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
          />
        </label>
        <input name="name" className="app-input" placeholder="Nombre visible (opcional)" defaultValue={defaults.name ?? ""} />
        <CitySelect name="city" defaultValue={defaults.city} emptyLabel="Selecciona tu ciudad" />
        <div className="grid gap-2">
          <input name="username" className="app-input" placeholder="username" defaultValue={defaults.username ?? ""} />
          <p className="text-xs text-slate-500">
            {usernameChangesRemaining === Number.POSITIVE_INFINITY
              ? "Tu username es único. No se puede repetir y, como admin, puedes cambiarlo las veces que quieras."
              : `Tu username es único. No se puede repetir y solo puedes cambiarlo 3 veces cada 30 días. Te quedan ${usernameChangesRemaining} cambio${usernameChangesRemaining === 1 ? "" : "s"} disponible${usernameChangesRemaining === 1 ? "" : "s"}.`}
          </p>
        </div>
        <textarea name="bio" className="app-textarea min-h-28" placeholder="Biografía" defaultValue={defaults.bio ?? ""} />

        <LocationFields
          mode={isVenue ? "venue" : "user"}
          latitudeDefault={defaults.latitude}
          longitudeDefault={defaults.longitude}
          addressDefault={defaults.locationAddress}
          addressName={isVenue ? "locationAddress" : undefined}
          helperText={
            isVenue
              ? "Elige la dirección exacta del local. Esa ubicación quedará fija y será la que verán los usuarios en el mapa."
              : "Si no quieres aparecer en el mapa, activa el modo fantasma. En el resto de modos se usará tu ubicación actual."
          }
        />

        {!isVenue ? (
          <select name="locationSharingMode" className="app-input" defaultValue={defaults.locationSharingMode ?? "GHOST"}>
            <option value="GHOST">Modo fantasma</option>
            <option value="APPROXIMATE">Ubicación aproximada</option>
            <option value="EXACT">Ubicación exacta</option>
          </select>
        ) : null}

        {isVenue ? (
          <div className="rounded-[20px] border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Horario del local</p>
                <p className="mt-1 text-xs text-slate-500">Se enseñará en el mapa cuando no tengas eventos próximos.</p>
              </div>
              <span className="app-pill">Mapa</span>
            </div>

            <div className="mt-4 grid gap-3">
              {venueHours.map((day) => (
                <div key={day.day} className="grid gap-2 rounded-2xl bg-white p-3 sm:grid-cols-[110px_1fr_1fr_auto] sm:items-center">
                  <p className="text-sm font-medium text-slate-800">{day.label}</p>
                  <input type="time" name={`venueHours_${day.day}_opensAt`} defaultValue={day.opensAt} className="app-input h-11" />
                  <input type="time" name={`venueHours_${day.day}_closesAt`} defaultValue={day.closesAt} className="app-input h-11" />
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" name={`venueHours_${day.day}_closed`} defaultChecked={day.closed} className="h-4 w-4 rounded border-neutral-300" />
                    Cerrado
                  </label>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {state.error ? <p className="mt-3 text-sm text-red-500">{state.error}</p> : null}
      {state.success ? <p className="mt-3 text-sm text-green-600">{state.success}</p> : null}

      <div className="mt-4">
        <SubmitButton className="app-button-primary w-full disabled:opacity-60" pendingText="Guardando perfil...">
          Guardar cambios
        </SubmitButton>
      </div>
    </form>
  );
}
