"use client";

import { PreciseLocationPicker } from "@/components/precise-location-picker";

export function LocationFields({
  mode,
  latitudeDefault,
  longitudeDefault,
  addressDefault,
  addressName,
  helperText,
}: {
  mode: "user" | "venue";
  latitudeDefault?: number | null;
  longitudeDefault?: number | null;
  addressDefault?: string | null;
  addressName?: string;
  helperText?: string;
}) {
  return (
    <PreciseLocationPicker
      mode={mode}
      latitudeDefault={latitudeDefault}
      longitudeDefault={longitudeDefault}
      addressDefault={addressDefault ?? undefined}
      addressName={addressName}
      helperText={helperText}
    />
  );
}
