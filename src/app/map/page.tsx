import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { approximateCoordinate, getDistanceInKm } from "@/lib/geo";
import { formatEventDate, formatPrice } from "@/lib/utils";
import { MapView } from "@/components/map-view";
import { LiveLocationSync } from "@/components/live-location-sync";
import { getBlockedUserIds } from "@/lib/privacy";
import { getMutualFriendIds } from "@/lib/social-graph";
import { getEventPath } from "@/lib/event-path";
import { MapLocationButton } from "@/components/map-location-button";
import { CitySelect } from "@/components/forms/city-select";
import { formatVenueHoursRows, getVenueHoursMapForUsers, getVenueHoursSummary, isVenueOpenNow } from "@/lib/venue-hours";

type RangeFilter = "today" | "weekend" | "7days";

type SearchParams = Promise<{
  range?: string;
  city?: string;
}>;

const DEFAULT_MAP_CENTER = {
  latitude: 40.4168,
  longitude: -3.7038,
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function getRangeWindow(range: RangeFilter, now: Date) {
  if (range === "today") {
    return {
      start: now,
      end: endOfDay(now),
      helper: "Siempre ves los locales del mapa. Este filtro prioriza los eventos que empiezan hoy.",
      chip: "Eventos hoy",
    };
  }

  if (range === "weekend") {
    const day = now.getDay();
    const fridayOffset = day === 0 ? -2 : day > 5 ? 0 : 5 - day;
    const start = startOfDay(addDays(now, fridayOffset));
    const end = endOfDay(addDays(start, 2));

    return {
      start: now > start ? now : start,
      end,
      helper: "Siempre ves los locales del mapa. Este filtro prioriza los planes del viernes al domingo.",
      chip: "Eventos este finde",
    };
  }

  return {
    start: now,
    end: endOfDay(addDays(now, 7)),
    helper: "Siempre ves los locales del mapa. Este filtro prioriza los eventos de la próxima semana.",
    chip: "Eventos 7 dias",
  };
}

function buildMapHref(range: RangeFilter, city?: string) {
  const params = new URLSearchParams();
  params.set("range", range);

  if (city?.trim()) {
    params.set("city", city.trim());
  }

  const query = params.toString();
  return query ? `/map?${query}` : "/map";
}

function buildDirectionsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

function normalizeRange(value?: string): RangeFilter {
  if (value === "today" || value === "weekend" || value === "7days") {
    return value;
  }

  return "7days";
}

function compareNullableDistance(a: number | null, b: number | null) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

export default async function MapPage({ searchParams }: { searchParams: SearchParams }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const isVenueUser = currentUser.role === "VENUE" || currentUser.role === "VENUE_PENDING";
  const params = await searchParams;
  const range = normalizeRange(params.range);
  const cityFilter = params.city?.trim() ?? "";
  const now = new Date();
  const rangeWindow = getRangeWindow(range, now);
  const blockedUserIds = await getBlockedUserIds(currentUser.id);

  const [following, friendIds, venues, ownVenueRequest] = await Promise.all([
    db.follow.findMany({
      where: { followerId: currentUser.id },
      select: { followingId: true },
    }),
    getMutualFriendIds(currentUser.id),
    db.venueRequest.findMany({
      where: {
        status: "APPROVED",
        latitude: { not: null },
        longitude: { not: null },
        ...(cityFilter
          ? {
              city: {
                contains: cityFilter,
                mode: "insensitive" as const,
              },
            }
          : {}),
        user: {
          ...(blockedUserIds.length ? { id: { notIn: blockedUserIds } } : {}),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
            events: {
              where: {
                published: true,
                date: {
                  gte: now,
                },
              },
              orderBy: { date: "asc" },
              take: 5,
              select: {
                id: true,
                slug: true,
                title: true,
                date: true,
                endDate: true,
                imageUrl: true,
                price: true,
                location: true,
                city: true,
              },
            },
          },
        },
      },
      take: 80,
    }),
    isVenueUser
      ? db.venueRequest.findUnique({
          where: { userId: currentUser.id },
          select: {
            latitude: true,
            longitude: true,
            businessName: true,
            city: true,
          },
        })
      : Promise.resolve(null),
  ]);

  const followingIds = new Set(following.map((item) => item.followingId));
  const venueHoursMap = await getVenueHoursMapForUsers(venues.map((venue) => venue.user.id));

  const friends = friendIds.length
    ? await db.user.findMany({
        where: {
          id: blockedUserIds.length ? { in: friendIds, notIn: blockedUserIds } : { in: friendIds },
          locationSharingMode: { not: "GHOST" },
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          id: true,
          username: true,
          name: true,
          city: true,
          avatarUrl: true,
          latitude: true,
          longitude: true,
          locationSharingMode: true,
        },
      })
    : [];

  const currentPosition = isVenueUser
    ? ownVenueRequest?.latitude != null && ownVenueRequest?.longitude != null
      ? {
          latitude: ownVenueRequest.latitude,
          longitude: ownVenueRequest.longitude,
        }
      : null
    : currentUser.latitude != null && currentUser.longitude != null
      ? {
          latitude: currentUser.latitude,
          longitude: currentUser.longitude,
        }
      : null;

  const nearbyVenues = venues
    .map((venue) => {
      const nextEvent = venue.user.events.find((event) => event.date >= rangeWindow.start && event.date <= rangeWindow.end) ?? null;
      const distance = currentPosition ? getDistanceInKm(currentPosition, { latitude: venue.latitude!, longitude: venue.longitude! }) : null;
      const venueHours = venueHoursMap.get(venue.user.id) ?? [];

      return {
        ...venue,
        nextEvent,
        nextPublishedEvent: venue.user.events[0] ?? null,
        distance,
        venueHours,
        isOpenNow: isVenueOpenNow(venueHours, now),
        hoursSummary: getVenueHoursSummary(venueHours),
        hoursRows: formatVenueHoursRows(venueHours),
        directionsUrl: buildDirectionsUrl(venue.latitude!, venue.longitude!),
      };
    })
    .filter((venue) => venue.user.id !== currentUser.id)
    .sort((a, b) => {
      const byDistance = compareNullableDistance(a.distance, b.distance);
      if (byDistance !== 0) return byDistance;
      return a.businessName.localeCompare(b.businessName, "es");
    })
    .slice(0, 30);

  const nearbyFriends = friends
    .map((friend) => ({
      ...friend,
      distance: currentPosition ? getDistanceInKm(currentPosition, { latitude: friend.latitude!, longitude: friend.longitude! }) : null,
    }))
    .sort((a, b) => {
      const byDistance = compareNullableDistance(a.distance, b.distance);
      if (byDistance !== 0) return byDistance;
      return (a.username ?? a.name ?? "").localeCompare(b.username ?? b.name ?? "", "es");
    })
    .slice(0, 20);

  const ownVenuePoint =
    isVenueUser && ownVenueRequest?.latitude != null && ownVenueRequest?.longitude != null
      ? {
          id: `venue-self-${currentUser.id}`,
          label: ownVenueRequest.businessName ?? currentUser.name ?? "Tu local",
          subtitle: `${ownVenueRequest.city ?? currentUser.city ?? "Tu local"} · ubicacion fija del local`,
          latitude: ownVenueRequest.latitude,
          longitude: ownVenueRequest.longitude,
          type: "venue" as const,
          href: currentUser.username ? `/u/${currentUser.username}` : "/profile/private",
          avatarUrl: currentUser.avatarUrl,
        imageUrl: null,
        fallbackText: ownVenueRequest.businessName ?? currentUser.username ?? currentUser.name ?? "L",
        ctaLabel: "Ver local",
        statusLabel: "Tu local",
        profileHref: currentUser.username ? `/u/${currentUser.username}` : undefined,
        directionsUrl: buildDirectionsUrl(ownVenueRequest.latitude, ownVenueRequest.longitude),
          eventPreviews:
            venues
              .find((venue) => venue.user.id === currentUser.id)
              ?.user.events.map((event) => ({
                id: event.id,
                slug: event.slug,
                title: event.title,
                dateLabel: formatEventDate(event.date),
                priceLabel: event.price == null ? "Gratis" : formatPrice(Number(event.price)) ?? "Gratis",
                imageUrl: event.imageUrl,
              })) ?? [],
        }
      : null;

  const points = [
    ...(!isVenueUser && currentPosition
      ? [
          {
            id: "me",
            label: "Tu",
            subtitle: "Tu ubicacion actual",
            latitude: currentPosition.latitude,
            longitude: currentPosition.longitude,
            type: "me" as const,
            avatarUrl: currentUser.avatarUrl,
            fallbackText: currentUser.username ?? currentUser.name ?? "T",
          },
        ]
      : ownVenuePoint
        ? [ownVenuePoint]
        : []),
    ...friends.map((friend) => {
      const latitude = friend.locationSharingMode === "APPROXIMATE" ? approximateCoordinate(friend.latitude!) : friend.latitude!;
      const longitude = friend.locationSharingMode === "APPROXIMATE" ? approximateCoordinate(friend.longitude!) : friend.longitude!;

      return {
        id: `friend-${friend.id}`,
        label: `@${friend.username ?? "usuario"}`,
        subtitle: friend.locationSharingMode === "APPROXIMATE" ? `${friend.city ?? "Amigo"} · ubicacion aproximada` : friend.city ?? "Amigo",
        latitude,
        longitude,
        type: "friend" as const,
        href: friend.username ? `/u/${friend.username}` : undefined,
        avatarUrl: friend.avatarUrl,
        fallbackText: friend.username ?? friend.name ?? "A",
        ctaLabel: "Ver perfil",
      };
    }),
    ...nearbyVenues.map((venue) => {
      const nextEvent = venue.nextEvent;
      const nextEventPrice = nextEvent?.price == null ? "Gratis" : formatPrice(Number(nextEvent.price)) ?? "Gratis";
      const profileHref = venue.user.username ? `/u/${venue.user.username}` : undefined;
      const eventsInRangeCount = venue.user.events.filter((event) => event.date >= rangeWindow.start && event.date <= rangeWindow.end).length;

      return {
        id: `venue-${venue.id}`,
        label: venue.businessName,
        subtitle: venue.distance == null ? venue.city : `${venue.city} · ${venue.distance.toFixed(1)} km`,
        latitude: venue.latitude!,
        longitude: venue.longitude!,
        type: "venue" as const,
        href: nextEvent ? getEventPath(nextEvent) : profileHref ?? "/events",
        avatarUrl: venue.user.avatarUrl,
        imageUrl: nextEvent?.imageUrl ?? venue.user.avatarUrl ?? null,
        fallbackText: venue.businessName,
        highlightLabel: nextEvent
          ? `${eventsInRangeCount} evento${eventsInRangeCount === 1 ? "" : "s"} · ${rangeWindow.chip.toLowerCase()}`
          : "Sin eventos proximos",
        detailTitle: nextEvent?.title ?? "Ahora mismo sin evento cercano",
        detailDate: nextEvent
          ? formatEventDate(nextEvent.date)
          : venue.nextPublishedEvent
            ? `Siguiente anuncio: ${formatEventDate(venue.nextPublishedEvent.date)}`
            : "Sin eventos publicados por ahora",
        detailPrice: nextEvent ? `${nextEventPrice} · ${nextEvent.location}` : undefined,
        hoursSummary: venue.hoursSummary,
        hoursRows: venue.hoursRows,
        statusLabel: venue.isOpenNow ? "Abierto ahora" : "Cerrado ahora",
        ctaLabel: nextEvent ? "Ver entradas" : "Ver local",
        profileHref,
        followUserId: venue.user.id !== currentUser.id && !followingIds.has(venue.user.id) ? venue.user.id : undefined,
        followRedirectPath: buildMapHref(range, cityFilter),
        directionsUrl: venue.directionsUrl,
        eventPreviews: venue.user.events.map((event) => ({
          id: event.id,
          slug: event.slug,
          title: event.title,
          dateLabel: formatEventDate(event.date),
          priceLabel: event.price == null ? "Gratis" : formatPrice(Number(event.price)) ?? "Gratis",
          imageUrl: event.imageUrl,
        })),
      };
    }),
  ];

  const mapCenter =
    currentPosition ??
    (points[0]
      ? {
          latitude: points[0].latitude,
          longitude: points[0].longitude,
        }
      : DEFAULT_MAP_CENTER);

  const rangeOptions: { value: RangeFilter; label: string; helper: string }[] = [
    { value: "today", label: "Hoy", helper: "Eventos que arrancan hoy" },
    { value: "weekend", label: "Este finde", helper: "Viernes a domingo" },
    { value: "7days", label: "7 dias", helper: "Proxima semana" },
  ];

  return (
    <div className="mx-auto max-w-[935px] space-y-3 sm:space-y-4">
      <LiveLocationSync enabled={currentUser.role !== "VENUE" && currentUser.role !== "VENUE_PENDING" && currentUser.locationSharingMode !== "GHOST"} />

      <section className="app-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="app-screen-title">Mapa</h1>
            <p className="mt-2 app-screen-subtitle">{rangeWindow.helper}</p>
          </div>
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

              {!currentPosition ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {isVenueUser
                    ? "Aun no hay una ubicacion fija guardada para tu local. Puedes seguir filtrando el mapa y ajustarla despues desde el perfil privado."
                    : "Todavia no has guardado una ubicacion exacta valida para centrar el mapa en ti. Aun asi puedes usar filtros y ver amigos o locales visibles."}
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-3">
                {rangeOptions.map((option) => (
                  <Link
                    key={option.value}
                    href={buildMapHref(option.value, cityFilter)}
                    className={`rounded-[20px] border px-4 py-3 text-left transition ${
                      range === option.value
                        ? "border-sky-200 bg-sky-50 shadow-sm"
                        : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-950">{option.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{option.helper}</p>
                  </Link>
                ))}
              </div>

              <form className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <CitySelect name="city" defaultValue={cityFilter} emptyLabel="Todas las ciudades" />
                <input type="hidden" name="range" value={range} />
                <button type="submit" className="app-button-primary">
                  Aplicar filtro
                </button>
              </form>
            </div>
          </details>
        </div>
      </section>

      <MapView center={mapCenter} points={points} />

      <section className="grid gap-3 md:grid-cols-2">
        <div className="app-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Locales en el mapa</h2>
              <p className="mt-1 text-sm text-slate-500">Todos los locales visibles en {cityFilter || "tu zona"}, con eventos u horario.</p>
            </div>
            <span className="app-pill">{nearbyVenues.length}</span>
          </div>

          <div className="mt-4 grid gap-3">
            {nearbyVenues.map((venue) => {
              const nextEvent = venue.nextEvent;
              const nextEventPrice = nextEvent?.price == null ? "Gratis" : formatPrice(Number(nextEvent.price)) ?? "Gratis";

              return (
                <div key={venue.id} className="rounded-3xl bg-neutral-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{venue.businessName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {venue.distance == null ? venue.city : `${venue.city} · ${venue.distance.toFixed(1)} km`}
                      </p>
                    </div>
                    <span className="app-pill whitespace-nowrap">{venue.isOpenNow ? "Abierto" : "Cerrado"}</span>
                  </div>

                  {nextEvent ? (
                    <div className="mt-3 rounded-2xl bg-white p-3">
                      <p className="text-sm font-semibold text-slate-950">{nextEvent.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatEventDate(nextEvent.date)}</p>
                      <p className="mt-1 text-xs font-medium text-slate-700">
                        {nextEventPrice} · {nextEvent.location}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl bg-white p-3">
                      <p className="text-sm font-semibold text-slate-950">Horario del local</p>
                      <p className="mt-1 text-xs text-slate-500">{venue.hoursSummary}</p>
                      <div className="mt-3 grid gap-1.5">
                        {venue.hoursRows.map((row) => (
                          <div key={row.day} className="flex items-center justify-between gap-3 text-xs text-slate-600">
                            <span>{row.day}</span>
                            <span className="font-medium text-slate-800">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={nextEvent ? getEventPath(nextEvent) : venue.user.username ? `/u/${venue.user.username}` : "/events"}
                      className="app-button-primary"
                    >
                      Ver local
                    </Link>
                    <Link href={venue.directionsUrl} target="_blank" rel="noreferrer" className="app-button-secondary">
                      Como llegar
                    </Link>
                  </div>
                </div>
              );
            })}

            {nearbyVenues.length === 0 ? <p className="text-sm text-slate-500">No hay locales visibles con esos filtros por ahora.</p> : null}
          </div>
        </div>

        <div className="app-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Amigos cerca</h2>
              <p className="mt-1 text-sm text-slate-500">Solo se muestran si comparten ubicacion contigo.</p>
            </div>
            <span className="app-pill">{nearbyFriends.length}</span>
          </div>

          <div className="mt-4 grid gap-3">
            {nearbyFriends.map((friend) => (
              <Link
                key={friend.id}
                href={friend.username ? `/u/${friend.username}` : "/profile"}
                className="rounded-3xl bg-neutral-50 p-4 transition hover:bg-neutral-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">@{friend.username ?? "usuario"}</p>
                    <p className="mt-1 text-xs text-slate-500">{friend.name ?? "Amigo"}</p>
                  </div>
                  {friend.distance != null ? <span className="app-pill whitespace-nowrap">{friend.distance.toFixed(1)} km</span> : null}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {friend.locationSharingMode === "APPROXIMATE" ? `${friend.city ?? "Sin ciudad"} · ubicacion aproximada` : friend.city ?? "Sin ciudad"}
                </p>
              </Link>
            ))}

            {nearbyFriends.length === 0 ? <p className="text-sm text-slate-500">No hay amigos visibles cerca ahora mismo.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
