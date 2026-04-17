"use client";

import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import { LocateFixed } from "lucide-react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { FollowToggleButton } from "@/components/follow-toggle-button";
import { getEventPath } from "@/lib/event-path";
import "leaflet/dist/leaflet.css";

type RealMapEventPreview = {
  id: string;
  slug?: string | null;
  title: string;
  dateLabel: string;
  priceLabel: string;
  imageUrl?: string | null;
};

export type RealMapPoint = {
  id: string;
  label: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  type: "me" | "friend" | "venue" | "event";
  href?: string;
  avatarUrl?: string | null;
  imageUrl?: string | null;
  fallbackText?: string;
  ctaLabel?: string;
  highlightLabel?: string;
  detailTitle?: string;
  detailDate?: string;
  detailPrice?: string;
  profileHref?: string;
  followUserId?: string;
  followRedirectPath?: string;
  eventPreviews?: RealMapEventPreview[];
  directionsUrl?: string;
};

const markerIconCache = new Map<string, L.DivIcon>();

function getMarkerTheme(type: RealMapPoint["type"]) {
  if (type === "me") return { ring: "#0f172a", fill: "#ffffff" };
  if (type === "friend") return { ring: "#0ea5e9", fill: "#ffffff" };
  if (type === "event") return { ring: "#f59e0b", fill: "#ffffff" };
  return { ring: "#e11d48", fill: "#ffffff" };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createAvatarMarker(point: RealMapPoint) {
  const safeImageUrl = point.avatarUrl ?? point.imageUrl ?? "";
  const cacheKey = `${point.type}|${point.label}|${point.fallbackText ?? ""}|${safeImageUrl}`;
  const cached = markerIconCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const theme = getMarkerTheme(point.type);
  const fallback = escapeHtml(point.fallbackText?.slice(0, 1).toUpperCase() ?? "•");
  const safeLabel = escapeHtml(point.label);
  const inner = safeImageUrl
    ? `<img src="${escapeHtml(safeImageUrl)}" alt="${safeLabel}" style="width:100%;height:100%;object-fit:cover;border-radius:9999px;" />`
    : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:9999px;background:${theme.fill};color:${theme.ring};font-weight:700;font-size:14px;">${fallback}</div>`;

  const icon = L.divIcon({
    className: "",
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:9999px;background:#fff;padding:3px;box-shadow:0 10px 24px rgba(15,23,42,0.18);border:3px solid ${theme.ring};">
        <div style="width:42px;height:42px;border-radius:9999px;overflow:hidden;background:${theme.fill};">
          ${inner}
        </div>
      </div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -20],
  });

  markerIconCache.set(cacheKey, icon);
  return icon;
}

function RecenterControl() {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);

  function recenterOnUser() {
    if (!navigator.geolocation || isLocating) return;

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.setView([position.coords.latitude, position.coords.longitude], Math.max(map.getZoom(), 15), {
          animate: true,
        });
        setIsLocating(false);
      },
      () => setIsLocating(false),
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  }

  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control leaflet-bar overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg">
        <button
          type="button"
          onClick={recenterOnUser}
          className="flex h-11 w-11 items-center justify-center bg-white text-slate-700 transition hover:bg-neutral-50 disabled:cursor-wait"
          aria-label="Centrar en tu posición"
          title="Centrar en tu posición"
          disabled={isLocating}
        >
          <LocateFixed className={`h-5 w-5 ${isLocating ? "animate-pulse" : ""}`} />
        </button>
      </div>
    </div>
  );
}

export function RealMap({
  center,
  points,
  heightClassName = "h-[62svh] min-h-[420px] sm:h-[68vh]",
  zoom = 14,
  enableClustering = true,
}: {
  center: { latitude: number; longitude: number };
  points: RealMapPoint[];
  heightClassName?: string;
  zoom?: number;
  enableClustering?: boolean;
}) {
  function stopPopupPropagation(event: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  const markerNodes = useMemo(
    () =>
      points.map((point) => (
        <Marker key={point.id} position={[point.latitude, point.longitude]} icon={createAvatarMarker(point)}>
          <Popup autoClose={false} closeOnClick={false} keepInView autoPanPadding={[24, 24]}>
            <div
              className="max-h-[58vh] min-w-[240px] max-w-[300px] overflow-y-auto pr-1 sm:min-w-[280px]"
              onClickCapture={stopPopupPropagation}
              onMouseDownCapture={stopPopupPropagation}
              onTouchStartCapture={stopPopupPropagation}
              onTouchEndCapture={stopPopupPropagation}
            >
              {point.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={point.imageUrl} alt={point.label} className="mb-3 h-32 w-full rounded-xl object-cover" loading="lazy" decoding="async" />
              ) : null}

              {point.highlightLabel ? (
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{point.highlightLabel}</p>
              ) : null}

              <p className="font-semibold text-slate-950">{point.label}</p>
              <p className="mt-1 text-sm text-slate-600">{point.subtitle}</p>

              {point.detailTitle ? (
                <div className="mt-3 rounded-2xl bg-neutral-50 p-3">
                  <p className="text-sm font-semibold text-slate-950">{point.detailTitle}</p>
                  {point.detailDate ? <p className="mt-1 text-xs text-slate-500">{point.detailDate}</p> : null}
                  {point.detailPrice ? <p className="mt-1 text-xs font-medium text-slate-700">{point.detailPrice}</p> : null}
                </div>
              ) : null}

              {point.eventPreviews?.length ? (
                <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                  {point.eventPreviews.map((event) => (
                    <Link key={event.id} href={getEventPath(event)} className="min-w-[180px] rounded-2xl border border-neutral-200 bg-white p-2.5">
                      {event.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={event.imageUrl} alt={event.title} className="mb-2 h-20 w-full rounded-xl object-cover" loading="lazy" decoding="async" />
                      ) : null}
                      <p className="line-clamp-1 text-sm font-semibold text-slate-950">{event.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{event.dateLabel}</p>
                      <p className="mt-1 text-xs font-medium text-slate-700">{event.priceLabel}</p>
                    </Link>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {point.href ? (
                  <Link href={point.href} className="inline-flex rounded-xl bg-sky-500 px-3 py-2 text-sm font-medium text-white">
                    {point.ctaLabel ?? "Abrir"}
                  </Link>
                ) : null}

                {point.profileHref ? (
                  <Link href={point.profileHref} className="inline-flex rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                    Ver perfil
                  </Link>
                ) : null}

                {point.followUserId ? (
                  <FollowToggleButton
                    targetUserId={point.followUserId}
                    redirectPath={point.followRedirectPath ?? "/map"}
                    username={point.label}
                    initialFollowing={false}
                    idleLabel="Seguir local"
                    activeLabel="Siguiendo"
                    className="inline-flex rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  />
                ) : null}

                {point.directionsUrl ? (
                  <Link
                    href={point.directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    Cómo llegar
                  </Link>
                ) : null}
              </div>
            </div>
          </Popup>
        </Marker>
      )),
    [points],
  );

  return (
    <div className={`overflow-hidden rounded-[24px] border border-neutral-200 bg-white ${heightClassName}`}>
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full"
        preferCanvas
        closePopupOnClick={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterControl />

        {enableClustering && points.length > 1 ? <MarkerClusterGroup chunkedLoading>{markerNodes}</MarkerClusterGroup> : markerNodes}
      </MapContainer>
    </div>
  );
}
