"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapLocationButton } from "@/components/map-location-button";
import { CitySelect } from "@/components/forms/city-select";

type RangeFilter = "today" | "weekend" | "7days";

type RangeOption = {
  value: RangeFilter;
  label: string;
  helper: string;
};

function buildMapUrl(pathname: string, range: RangeFilter, city: string) {
  const params = new URLSearchParams();
  params.set("range", range);

  if (city.trim()) {
    params.set("city", city.trim());
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function MapFilters({
  range,
  cityFilter,
  rangeOptions,
  isVenueUser,
}: {
  range: RangeFilter;
  cityFilter: string;
  rangeOptions: RangeOption[];
  isVenueUser: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedCity, setSelectedCity] = useState(cityFilter);

  function updateUrl(nextRange: RangeFilter, nextCity: string) {
    const currentRange = searchParams.get("range") ?? "7days";
    const currentCity = searchParams.get("city") ?? "";

    if (currentRange === nextRange && currentCity === nextCity.trim()) {
      return;
    }

    startTransition(() => {
      router.replace(buildMapUrl(pathname, nextRange, nextCity), { scroll: false });
    });
  }

  return (
    <details className="w-full sm:w-auto sm:min-w-[320px]">
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-[22px] border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-neutral-100">
        <span>Filtros</span>
        <span className="app-pill">{rangeOptions.find((option) => option.value === range)?.label ?? "7 dias"}</span>
      </summary>

      <div className="mt-3 grid gap-3 rounded-[22px] border border-neutral-200 bg-white p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          <Link href="/profile/private" className="app-button-secondary">
            Ajustar ubicacion
          </Link>
          {!isVenueUser ? <MapLocationButton /> : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={isPending}
              onClick={() => updateUrl(option.value, selectedCity)}
              className={`rounded-[20px] border px-4 py-3 text-left transition ${
                range === option.value
                  ? "border-sky-200 bg-sky-50 shadow-sm"
                  : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
              } ${isPending ? "opacity-80" : ""}`}
            >
              <p className="text-sm font-semibold text-slate-950">{option.label}</p>
              <p className="mt-1 text-xs text-slate-500">{option.helper}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <CitySelect
            name="city"
            defaultValue={selectedCity}
            value={selectedCity}
            onChange={(event) => {
              const nextCity = event.target.value;
              setSelectedCity(nextCity);
              updateUrl(range, nextCity);
            }}
            emptyLabel="Todas las ciudades"
          />
          <button type="button" className="app-button-primary" disabled={isPending} onClick={() => updateUrl(range, selectedCity)}>
            {isPending ? "Actualizando..." : "Aplicar filtro"}
          </button>
        </div>
      </div>
    </details>
  );
}
