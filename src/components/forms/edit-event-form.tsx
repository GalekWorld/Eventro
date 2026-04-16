"use client";

import { useActionState, useMemo, useState } from "react";
import { CalendarDays, Clock3, ImagePlus, MapPin, Ticket } from "lucide-react";
import type { ActionState } from "@/lib/http";
import { updateEventBasicsAction } from "@/app/actions/local";
import { SubmitButton } from "@/components/forms/submit-button";
import { PreciseLocationPicker } from "@/components/precise-location-picker";
import { parseVipSpace, serializeVipSpace } from "@/lib/vip-space";

const initialState: ActionState = {};

function FieldCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-100 text-slate-700">{icon}</div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function formatDateInput(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatTimeInput(value?: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(11, 16);
}

export function EditEventForm({
  event,
}: {
  event: {
    id: string;
    title: string;
    description: string | null;
    location: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
    date: Date | string;
    endDate: Date | string | null;
    imageUrl: string | null;
    published: boolean;
    hasReservations: boolean;
    reservationInfo: string | null;
  };
}) {
  const [state, formAction] = useActionState(updateEventBasicsAction, initialState);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [location, setLocation] = useState(event.location);
  const [city, setCity] = useState(event.city);
  const [published, setPublished] = useState(event.published);
  const [hasReservations, setHasReservations] = useState(event.hasReservations);
  const vipDefaults = useMemo(() => parseVipSpace(event.reservationInfo), [event.reservationInfo]);
  const [isAdultsOnly, setIsAdultsOnly] = useState(vipDefaults?.adultsOnly ?? false);
  const [vipHowItIs, setVipHowItIs] = useState(vipDefaults?.howItIs ?? "");
  const [vipPrice, setVipPrice] = useState(vipDefaults?.price ?? "");
  const [vipIncludes, setVipIncludes] = useState(vipDefaults?.includes ?? "");
  const [vipDescription, setVipDescription] = useState(vipDefaults?.description ?? "");
  const serializedVipSpace = serializeVipSpace({
    howItIs: vipHowItIs,
    price: vipPrice,
    includes: vipIncludes,
    description: vipDescription,
    adultsOnly: isAdultsOnly,
  });

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="eventId" value={event.id} />

      <FieldCard
        icon={<CalendarDays className="h-5 w-5" />}
        title="Información básica"
        description="Edita el anuncio del evento sin tocar el flujo de entradas vendidas."
      >
        <div className="grid gap-3">
          <input name="title" className="app-input" placeholder="Título del evento" defaultValue={event.title} />
          <textarea
            name="description"
            className="app-input min-h-32 resize-none"
            placeholder="Descripción"
            defaultValue={event.description ?? ""}
          />
          <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={isAdultsOnly} onChange={(nextEvent) => setIsAdultsOnly(nextEvent.target.checked)} />
              Este evento es +18
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={hasReservations}
                onChange={(nextEvent) => setHasReservations(nextEvent.target.checked)}
              />
              Este evento tiene Espacio VIP
            </label>
            <input type="hidden" name="hasReservations" value={hasReservations ? "true" : "false"} />
            <input type="hidden" name="reservationInfo" value={serializedVipSpace} />
            {hasReservations ? (
              <div className="mt-3 grid gap-3">
                <input
                  className="app-input"
                  placeholder="Cómo es el Espacio VIP"
                  value={vipHowItIs}
                  onChange={(nextEvent) => setVipHowItIs(nextEvent.target.value)}
                />
                <input
                  className="app-input"
                  placeholder="Precio del Espacio VIP"
                  value={vipPrice}
                  onChange={(nextEvent) => setVipPrice(nextEvent.target.value)}
                />
                <input
                  className="app-input"
                  placeholder="Qué incluye"
                  value={vipIncludes}
                  onChange={(nextEvent) => setVipIncludes(nextEvent.target.value)}
                />
                <textarea
                  className="app-input min-h-24 resize-none"
                  placeholder="Descripción del Espacio VIP"
                  value={vipDescription}
                  onChange={(nextEvent) => setVipDescription(nextEvent.target.value)}
                />
              </div>
            ) : null}
          </div>
        </div>
      </FieldCard>

      <FieldCard
        icon={<Clock3 className="h-5 w-5" />}
        title="Fecha y horario"
        description="Corrige fecha, inicio o final si el evento ha cambiado."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <input name="eventDate" className="app-input" type="date" defaultValue={formatDateInput(event.date)} />
          <input name="startTime" className="app-input" type="time" defaultValue={formatTimeInput(event.date)} />
          <input name="endTime" className="app-input" type="time" defaultValue={formatTimeInput(event.endDate)} />
        </div>
      </FieldCard>

      <FieldCard
        icon={<MapPin className="h-5 w-5" />}
        title="Ubicación"
        description="Actualiza la dirección exacta donde se celebra el evento."
      >
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="location"
              className="app-input"
              placeholder="Calle y número"
              value={location}
              onChange={(nextEvent) => setLocation(nextEvent.target.value)}
            />
            <input
              name="city"
              className="app-input"
              placeholder="Ciudad"
              value={city}
              onChange={(nextEvent) => setCity(nextEvent.target.value)}
            />
          </div>

          <PreciseLocationPicker
            searchQuery={[location, city].filter(Boolean).join(", ")}
            latitudeDefault={event.latitude}
            longitudeDefault={event.longitude}
            helperText="Busca la calle exacta o usa tu ubicación actual para corregir el punto."
          />
        </div>
      </FieldCard>

      <FieldCard
        icon={<ImagePlus className="h-5 w-5" />}
        title="Imagen del evento"
        description="Sube una imagen nueva solo si quieres reemplazar la portada actual."
      >
        <div className="grid gap-3">
          {event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.imageUrl} alt={event.title} className="h-40 w-full rounded-[24px] object-cover" />
          ) : null}
          <label
            className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed px-5 py-6 text-center transition ${
              dragging ? "border-sky-400 bg-sky-50" : "border-neutral-300 bg-neutral-50"
            }`}
            onDragOver={(nextEvent) => {
              nextEvent.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={() => setDragging(false)}
          >
            <input
              type="file"
              name="image"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(nextEvent) => setFileName(nextEvent.target.files?.[0]?.name ?? "")}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
              <ImagePlus className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-950">Toca para sustituir la portada</p>
            {fileName ? <p className="mt-2 text-sm text-sky-700">{fileName}</p> : null}
          </label>
        </div>
      </FieldCard>

      <section className="app-card grid gap-4 p-4 sm:p-5">
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={published} onChange={(nextEvent) => setPublished(nextEvent.target.checked)} />
          Mantener el evento publicado
        </label>
        <input type="hidden" name="published" value={published ? "true" : "false"} />

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-slate-600">
          <div className="flex items-center gap-2 text-slate-950">
            <Ticket className="h-4 w-4" />
            <span className="font-medium">Las entradas se gestionan por separado</span>
          </div>
          <p className="mt-2">Esta edición actualiza cartel, fecha, ubicación y VIP. Los tipos de entrada siguen como están para no romper ventas existentes.</p>
        </div>

        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

        <SubmitButton className="app-button-primary w-full disabled:opacity-60" pendingText="Guardando evento...">
          Guardar cambios
        </SubmitButton>
      </section>
    </form>
  );
}
