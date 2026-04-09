"use client";

import { useMemo } from "react";
import { MapPin, Store, Users } from "lucide-react";
import { getDistanceInKm } from "@/lib/geo";

type MapPoint = {
  id: string;
  label: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  type: "me" | "friend" | "venue";
  href?: string;
};

function getPointColor(type: MapPoint["type"]) {
  if (type === "me") return "bg-slate-950 text-white";
  if (type === "friend") return "bg-sky-500 text-white";
  return "bg-rose-500 text-white";
}

export function SocialMap({
  me,
  friends,
  venues,
}: {
  me: { latitude: number | null; longitude: number | null };
  friends: MapPoint[];
  venues: MapPoint[];
}) {
  const points = useMemo(() => {
    if (me.latitude == null || me.longitude == null) return [];

    return [
      {
        id: "me",
        label: "Tú",
        subtitle: "Tu ubicación",
        latitude: me.latitude,
        longitude: me.longitude,
        type: "me" as const,
      },
      ...friends,
      ...venues,
    ];
  }, [friends, me.latitude, me.longitude, venues]);

  const mapPoints = useMemo(() => {
    if (points.length === 0 || me.latitude == null || me.longitude == null) return [];

    const currentLatitude = me.latitude;
    const currentLongitude = me.longitude;

    const latitudes = points.map((point) => point.latitude);
    const longitudes = points.map((point) => point.longitude);
    const minLat = Math.min(...latitudes) - 0.01;
    const maxLat = Math.max(...latitudes) + 0.01;
    const minLng = Math.min(...longitudes) - 0.01;
    const maxLng = Math.max(...longitudes) + 0.01;
    const latRange = Math.max(maxLat - minLat, 0.02);
    const lngRange = Math.max(maxLng - minLng, 0.02);

    return points.map((point) => ({
      ...point,
      left: `${((point.longitude - minLng) / lngRange) * 100}%`,
      top: `${100 - ((point.latitude - minLat) / latRange) * 100}%`,
      distance:
        point.type === "me"
          ? 0
          : getDistanceInKm(
              { latitude: currentLatitude, longitude: currentLongitude },
              { latitude: point.latitude, longitude: point.longitude },
            ),
    }));
  }, [me.latitude, me.longitude, points]);

  if (me.latitude == null || me.longitude == null) {
    return (
      <div className="app-card p-5">
        <p className="text-sm text-slate-500">Guarda tu ubicación desde el perfil privado para ver el mapa social.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="app-card overflow-hidden rounded-[24px]">
        <div className="relative aspect-[4/5] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.25),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_45%,_#ecfeff_100%)]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:56px_56px]" />
          <div className="absolute inset-6 rounded-full border border-slate-300/50" />
          <div className="absolute inset-[18%] rounded-full border border-slate-300/40" />
          <div className="absolute inset-[31%] rounded-full border border-slate-300/30" />

          {mapPoints.map((point) => (
            <a
              key={point.id}
              href={point.href ?? "#"}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: point.left, top: point.top }}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg ${getPointColor(point.type)}`}>
                {point.type === "venue" ? <Store className="h-4 w-4" /> : point.type === "friend" ? <Users className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        {mapPoints
          .filter((point) => point.type !== "me")
          .sort((a, b) => a.distance - b.distance)
          .map((point) => (
            <a key={point.id} href={point.href ?? "#"} className="app-card flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">{point.label}</p>
                <p className="text-sm text-slate-500">{point.subtitle}</p>
              </div>
              <span className="app-pill">{point.distance.toFixed(1)} km</span>
            </a>
          ))}

        {mapPoints.filter((point) => point.type !== "me").length === 0 ? (
          <div className="app-card p-5 text-sm text-slate-500">Todavía no hay amigos ni locales cercanos con ubicación disponible.</div>
        ) : null}
      </section>
    </div>
  );
}
