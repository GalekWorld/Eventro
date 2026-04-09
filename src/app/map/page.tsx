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

type RangeFilter = "today" | "weekend" | "7days";

type SearchParams = Promise<{
  range?: string;
  city?: string;
}>;

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
      title: "Hoy",
      helper: "Locales con eventos que empiezan hoy.",
      chip: "Activos hoy",
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
      title: "Este finde",
      helper: "Locales con planes del viernes al domingo.",
      chip: "Activos este finde",
    };
  }

  return {
    start: now,
    end: endOfDay(addDays(now, 7)),
    title: "Próximos 7 días",
    helper: "Locales con eventos publicados durante la próxima semana.",
    chip: "Activos 7 días",
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

export default async function MapPage({ searchParams }: { searchParams: SearchParams }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }
  const params = await searchParams;
  const range = normalizeRange(params.range);
  const cityFilter = params.city?.trim() ?? "";
  const now = new Date();
  const rangeWindow = getRangeWindow(range, now);
  const blockedUserIds = await getBlockedUserIds(currentUser.id);

  const [following, friendIds, venues] = await Promise.all([
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
          events: {
            some: {
              published: true,
              date: {
                gte: rangeWindow.start,
                lte: rangeWindow.end,
              },
            },
          },
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
                  gte: rangeWindow.start,
                  lte: rangeWindow.end,
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
  ]);

  const followingIds = new Set(following.map((item) => item.followingId));

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

  if (currentUser.latitude == null || currentUser.longitude == null) {
    return (
      <div className="mx-auto max-w-[935px] space-y-4">
        <section className="app-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="app-screen-title">Mapa</h1>
              <p className="mt-2 app-screen-subtitle">
                Guarda tu ubicación exacta para ver a tus amigos y los locales con eventos cerca de ti.
              </p>
            </div>
            <Link href="/profile/private" className="app-button-secondary">
              Ajustar ubicación
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const currentPosition = {
    latitude: currentUser.latitude,
    longitude: currentUser.longitude,
  };

  const nearbyVenues = venues
    .map((venue) => {
      const nextEvent = venue.user.events[0] ?? null;
      const distance = getDistanceInKm(currentPosition, { latitude: venue.latitude!, longitude: venue.longitude! });

      return {
        ...venue,
        nextEvent,
        distance,
        directionsUrl: buildDirectionsUrl(venue.latitude!, venue.longitude!),
      };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 30);

  const nearbyFriends = friends
    .map((friend) => ({
      ...friend,
      distance: getDistanceInKm(currentPosition, { latitude: friend.latitude!, longitude: friend.longitude! }),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 20);

  const points = [
    {
      id: "me",
      label: "Tú",
      subtitle: "Tu ubicación actual",
      latitude: currentPosition.latitude,
      longitude: currentPosition.longitude,
      type: "me" as const,
      avatarUrl: currentUser.avatarUrl,
      fallbackText: currentUser.username ?? currentUser.name ?? "T",
    },
    ...friends.map((friend) => {
      const latitude = friend.locationSharingMode === "APPROXIMATE" ? approximateCoordinate(friend.latitude!) : friend.latitude!;
      const longitude = friend.locationSharingMode === "APPROXIMATE" ? approximateCoordinate(friend.longitude!) : friend.longitude!;

      return {
        id: `friend-${friend.id}`,
        label: `@${friend.username ?? "usuario"}`,
        subtitle:
          friend.locationSharingMode === "APPROXIMATE"
            ? `${friend.city ?? "Amigo"} · ubicación aproximada`
            : friend.city ?? "Amigo",
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

      return {
        id: `venue-${venue.id}`,
        label: venue.businessName,
        subtitle: `${venue.city} · ${venue.distance.toFixed(1)} km`,
        latitude: venue.latitude!,
        longitude: venue.longitude!,
        type: "venue" as const,
        href: nextEvent ? getEventPath(nextEvent) : profileHref ?? "/events",
        avatarUrl: venue.user.avatarUrl,
        imageUrl: nextEvent?.imageUrl ?? venue.user.avatarUrl ?? null,
        fallbackText: venue.businessName,
        highlightLabel: `${venue.user.events.length} evento${venue.user.events.length === 1 ? "" : "s"} · ${rangeWindow.chip.toLowerCase()}`,
        detailTitle: nextEvent?.title ?? "Próximo evento",
        detailDate: nextEvent ? formatEventDate(nextEvent.date) : undefined,
        detailPrice: nextEvent ? `${nextEventPrice} · ${nextEvent.location}` : undefined,
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

  const rangeOptions: { value: RangeFilter; label: string; helper: string }[] = [
    { value: "today", label: "Hoy", helper: "Eventos que arrancan hoy" },
    { value: "weekend", label: "Este finde", helper: "Viernes a domingo" },
    { value: "7days", label: "7 días", helper: "Próxima semana" },
  ];

  return (
    <div className="mx-auto max-w-[935px] space-y-3 sm:space-y-4">
      <LiveLocationSync enabled={currentUser.locationSharingMode !== "GHOST"} />

      <section className="app-card p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="app-screen-title">Mapa</h1>
              <p className="mt-2 app-screen-subtitle">{rangeWindow.helper}</p>
            </div>
            <Link href="/profile/private" className="app-button-secondary">
              Ajustar ubicación
            </Link>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {rangeOptions.map((option) => (
              <Link
                key={option.value}
                href={buildMapHref(option.value, cityFilter)}
                className={`rounded-[22px] border px-4 py-3 text-left transition ${
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
            <input name="city" defaultValue={cityFilter} placeholder="Filtrar por ciudad" className="app-input" />
            <input type="hidden" name="range" value={range} />
            <button type="submit" className="app-button-primary">
              Aplicar filtro
            </button>
          </form>
        </div>
      </section>

      <MapView center={currentPosition} points={points} />

      <section className="grid gap-3 md:grid-cols-2">
        <div className="app-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Locales activos</h2>
              <p className="mt-1 text-sm text-slate-500">{rangeWindow.chip} en {cityFilter || "tu zona"}.</p>
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
                        {venue.city} · {venue.distance.toFixed(1)} km
                      </p>
                    </div>
                    <span className="app-pill whitespace-nowrap">{venue.user.events.length} planes</span>
                  </div>

                  {nextEvent ? (
                    <div className="mt-3 rounded-2xl bg-white p-3">
                      <p className="text-sm font-semibold text-slate-950">{nextEvent.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatEventDate(nextEvent.date)}</p>
                      <p className="mt-1 text-xs font-medium text-slate-700">
                        {nextEventPrice} · {nextEvent.location}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={nextEvent ? getEventPath(nextEvent) : venue.user.username ? `/u/${venue.user.username}` : "/events"}
                      className="app-button-primary"
                    >
                      Ver local
                    </Link>
                    <Link href={venue.directionsUrl} target="_blank" rel="noreferrer" className="app-button-secondary">
                      Cómo llegar
                    </Link>
                  </div>
                </div>
              );
            })}

            {nearbyVenues.length === 0 ? <p className="text-sm text-slate-500">No hay locales con eventos en este rango por ahora.</p> : null}
          </div>
        </div>

        <div className="app-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Amigos cerca</h2>
              <p className="mt-1 text-sm text-slate-500">Solo se muestran si comparten ubicación contigo.</p>
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
                  <span className="app-pill whitespace-nowrap">{friend.distance.toFixed(1)} km</span>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {friend.locationSharingMode === "APPROXIMATE" ? `${friend.city ?? "Sin ciudad"} · ubicación aproximada` : friend.city ?? "Sin ciudad"}
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
