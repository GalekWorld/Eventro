"use client";

import { useActionState } from "react";
import { submitVenueRequestAction } from "@/app/actions/venue";
import type { ActionState } from "@/lib/http";
import { SubmitButton } from "@/components/forms/submit-button";
import { LocationFields } from "@/components/forms/location-fields";

const initialState: ActionState = {};

type VenueRequestDefaults = {
  businessName?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  category?: string | null;
  description?: string | null;
  phone?: string | null;
  website?: string | null;
  instagram?: string | null;
};

export function VenueRequestForm({ defaults }: { defaults?: VenueRequestDefaults }) {
  const [state, formAction] = useActionState(submitVenueRequestAction, initialState);

  return (
    <form action={formAction} className="app-card grid gap-4 p-5 md:grid-cols-2">
      <input name="businessName" className="app-input" placeholder="Nombre del negocio" defaultValue={defaults?.businessName ?? ""} />
      <input name="city" className="app-input" placeholder="Ciudad" defaultValue={defaults?.city ?? ""} />
      <input name="category" className="app-input" placeholder="Categoría" defaultValue={defaults?.category ?? ""} />
      <input name="phone" className="app-input" placeholder="Teléfono" defaultValue={defaults?.phone ?? ""} />
      <input name="website" className="app-input" placeholder="Web" defaultValue={defaults?.website ?? ""} />
      <input name="instagram" className="app-input" placeholder="Instagram" defaultValue={defaults?.instagram ?? ""} />

      <div className="md:col-span-2">
        <LocationFields
          mode="venue"
          latitudeDefault={defaults?.latitude}
          longitudeDefault={defaults?.longitude}
          addressDefault={defaults?.address}
          addressName="address"
          helperText="Busca la calle exacta del local y confirma en el mapa que el punto corresponde justo al sitio correcto."
        />
      </div>

      <textarea
        name="description"
        className="app-textarea min-h-36 md:col-span-2"
        placeholder="Cuéntanos qué tipo de local eres y qué eventos quieres publicar"
        defaultValue={defaults?.description ?? ""}
      />

      {state.error ? <p className="text-sm text-red-500 md:col-span-2">{state.error}</p> : null}

      <SubmitButton className="app-button-primary md:col-span-2 disabled:opacity-60" pendingText="Enviando solicitud...">
        Enviar solicitud
      </SubmitButton>
    </form>
  );
}
