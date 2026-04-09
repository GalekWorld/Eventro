"use client";

import type { ReactNode } from "react";
import { useActionState, useState } from "react";
import { CalendarDays, Clock3, ImagePlus, MapPin, Plus, Ticket, Trash2 } from "lucide-react";
import type { ActionState } from "@/lib/http";
import { createEventAction } from "@/app/actions/local";
import { SubmitButton } from "@/components/forms/submit-button";
import { PreciseLocationPicker } from "@/components/precise-location-picker";

const initialState: ActionState = {};

type TicketTypeDraft = {
  id: string;
  name: string;
  description: string;
  price: string;
  capacity: string;
  includedDrinks: string;
  salesStart: string;
  salesEnd: string;
  isVisible: boolean;
};

function createTicketTypeDraft(overrides?: Partial<TicketTypeDraft>): TicketTypeDraft {
  return {
    id: crypto.randomUUID(),
    name: "Entrada general",
    description: "",
    price: "0",
    capacity: "100",
    includedDrinks: "0",
    salesStart: "",
    salesEnd: "",
    isVisible: true,
    ...overrides,
  };
}

function FieldCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-100 text-slate-700">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function CreateEventForm() {
  const [state, formAction] = useActionState(createEventAction, initialState);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [ticketTypes, setTicketTypes] = useState<TicketTypeDraft[]>([
    createTicketTypeDraft(),
    createTicketTypeDraft({
      name: "Entrada anticipada",
      price: "12",
      capacity: "50",
    }),
  ]);

  function updateTicketType(id: string, key: keyof TicketTypeDraft, value: string | boolean) {
    setTicketTypes((current) =>
      current.map((ticketType) =>
        ticketType.id === id
          ? {
              ...ticketType,
              [key]: value,
            }
          : ticketType,
      ),
    );
  }

  function addTicketType() {
    setTicketTypes((current) => [
      ...current,
      createTicketTypeDraft({
        name: `Entrada ${current.length + 1}`,
      }),
    ]);
  }

  function removeTicketType(id: string) {
    setTicketTypes((current) => (current.length > 1 ? current.filter((ticketType) => ticketType.id !== id) : current));
  }

  const serializedTicketTypes = JSON.stringify(
    ticketTypes.map(({ id, ...ticketType }) => ticketType),
  );

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="ticketTypes" value={serializedTicketTypes} />

      <FieldCard
        icon={<CalendarDays className="h-5 w-5" />}
        title="Información básica"
        description="Ponle nombre al evento y explica bien qué va a pasar."
      >
        <div className="grid gap-3">
          <input name="title" className="app-input" placeholder="Título del evento" />
          <textarea
            name="description"
            className="app-input min-h-32 resize-none"
            placeholder="Descripción, ambiente, artistas, dress code, promos o lo que haga falta."
          />
        </div>
      </FieldCard>

      <FieldCard
        icon={<Clock3 className="h-5 w-5" />}
        title="Fecha y horario"
        description="Elige claramente cuándo empieza y cuándo termina."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <input name="eventDate" className="app-input" type="date" />
          <input name="startTime" className="app-input" type="time" />
          <input name="endTime" className="app-input" type="time" />
        </div>
      </FieldCard>

      <FieldCard
        icon={<Ticket className="h-5 w-5" />}
        title="Entradas"
        description="Configura varios tipos de entrada con precio, cupo y ventana de venta, como en una herramienta real de ticketing."
      >
        <div className="grid gap-4">
          {ticketTypes.map((ticketType, index) => (
            <div key={ticketType.id} className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950">Tipo de entrada {index + 1}</p>
                <button
                  type="button"
                  onClick={() => removeTicketType(ticketType.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-slate-500 transition hover:text-red-500"
                  aria-label="Eliminar tipo de entrada"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    className="app-input"
                    placeholder="Nombre"
                    value={ticketType.name}
                    onChange={(event) => updateTicketType(ticketType.id, "name", event.target.value)}
                  />
                  <input
                    className="app-input"
                    placeholder="Descripción breve"
                    value={ticketType.description}
                    onChange={(event) => updateTicketType(ticketType.id, "description", event.target.value)}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    className="app-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Precio"
                    value={ticketType.price}
                    onChange={(event) => updateTicketType(ticketType.id, "price", event.target.value)}
                  />
                  <input
                    className="app-input"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Cantidad disponible"
                    value={ticketType.capacity}
                    onChange={(event) => updateTicketType(ticketType.id, "capacity", event.target.value)}
                  />
                  <input
                    className="app-input"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Consumiciones"
                    value={ticketType.includedDrinks}
                    onChange={(event) => updateTicketType(ticketType.id, "includedDrinks", event.target.value)}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    className="app-input"
                    type="datetime-local"
                    value={ticketType.salesStart}
                    onChange={(event) => updateTicketType(ticketType.id, "salesStart", event.target.value)}
                  />
                  <input
                    className="app-input"
                    type="datetime-local"
                    value={ticketType.salesEnd}
                    onChange={(event) => updateTicketType(ticketType.id, "salesEnd", event.target.value)}
                  />
                </div>

                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={ticketType.isVisible}
                    onChange={(event) => updateTicketType(ticketType.id, "isVisible", event.target.checked)}
                  />
                  Mostrar este tipo de entrada al público
                </label>
              </div>
            </div>
          ))}

          <button type="button" onClick={addTicketType} className="app-button-secondary w-full">
            <Plus className="h-4 w-4" />
            Añadir otro tipo de entrada
          </button>
        </div>
      </FieldCard>

      <FieldCard
        icon={<MapPin className="h-5 w-5" />}
        title="Ubicación"
        description="Guarda la dirección exacta para que el local y el evento salgan bien en el mapa."
      >
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="location"
              className="app-input"
              placeholder="Calle y número"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
            <input
              name="city"
              className="app-input"
              placeholder="Ciudad"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </div>

          <PreciseLocationPicker
            searchQuery={[location, city].filter(Boolean).join(", ")}
            helperText="Busca la calle exacta o usa tu ubicación actual para guardar el punto con precisión."
          />
        </div>
      </FieldCard>

      <FieldCard
        icon={<ImagePlus className="h-5 w-5" />}
        title="Imagen del evento"
        description="Sube la portada que verá la gente en el mapa y en el feed de eventos."
      >
        <label
          className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed px-5 py-8 text-center transition ${
            dragging ? "border-sky-400 bg-sky-50" : "border-neutral-300 bg-neutral-50"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
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
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
          />
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
            <ImagePlus className="h-6 w-6" />
          </div>
          <p className="mt-4 text-lg font-semibold text-slate-950">Arrastra la imagen o toca para subirla</p>
          <p className="mt-2 text-sm text-slate-500">PNG, JPG o WEBP hasta 5MB</p>
          {fileName ? <p className="mt-3 text-sm text-sky-700">{fileName}</p> : null}
        </label>
      </FieldCard>

      <section className="app-card grid gap-4 p-4 sm:p-5">
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input type="checkbox" name="published" value="true" />
          Publicar el evento ahora
        </label>

        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

        <SubmitButton className="app-button-primary w-full disabled:opacity-60" pendingText="Guardando evento...">
          Guardar evento
        </SubmitButton>
      </section>
    </form>
  );
}
