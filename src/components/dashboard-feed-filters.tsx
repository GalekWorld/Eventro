"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CitySelect } from "@/components/forms/city-select";

type FeedTab = "discover" | "friends";

function buildDashboardUrl(pathname: string, tab: FeedTab, city: string) {
  const params = new URLSearchParams();
  params.set("tab", tab);

  if (city.trim()) {
    params.set("city", city.trim());
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function DashboardFeedFilters({
  activeTab,
  cityFilter,
}: {
  activeTab: FeedTab;
  cityFilter: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedCity, setSelectedCity] = useState(cityFilter);

  function updateUrl(nextTab: FeedTab, nextCity: string) {
    const currentTab = (searchParams.get("tab") === "friends" ? "friends" : "discover") as FeedTab;
    const currentCity = searchParams.get("city") ?? "";

    if (currentTab === nextTab && currentCity === nextCity.trim()) {
      return;
    }

    startTransition(() => {
      router.replace(buildDashboardUrl(pathname, nextTab, nextCity), { scroll: false });
    });
  }

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="grid grid-cols-2 gap-1 rounded-[16px] bg-neutral-100 p-1 sm:inline-flex sm:rounded-full">
        <button
          type="button"
          onClick={() => updateUrl("discover", selectedCity)}
          className={`rounded-[12px] px-3 py-1.5 text-center text-sm font-medium transition sm:rounded-full ${
            activeTab === "discover" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
          }`}
        >
          Descubre
        </button>
        <button
          type="button"
          onClick={() => updateUrl("friends", selectedCity)}
          className={`rounded-[12px] px-3 py-1.5 text-center text-sm font-medium transition sm:rounded-full ${
            activeTab === "friends" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
          }`}
        >
          Amigos
        </button>
      </div>

      <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:w-[300px]">
        <CitySelect
          name="city"
          defaultValue={selectedCity}
          value={selectedCity}
          onChange={(event) => {
            const nextCity = event.target.value;
            setSelectedCity(nextCity);
            updateUrl(activeTab, nextCity);
          }}
          className="app-input h-10 min-w-0"
          emptyLabel="Todas las ciudades"
        />
        <button type="button" className="app-button-secondary w-full sm:w-auto" disabled={isPending} onClick={() => updateUrl(activeTab, selectedCity)}>
          {isPending ? "Filtrando..." : "Filtrar"}
        </button>
      </div>
    </div>
  );
}
