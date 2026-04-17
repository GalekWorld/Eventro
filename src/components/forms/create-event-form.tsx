"use client";

import type { ReactNode } from "react";
import { useActionState, useState } from "react";
import { CalendarDays, Clock3, ImagePlus, MapPin, Plus, Ticket, Trash2 } from "lucide-react";
import type { ActionState } from "@/lib/http";
import { createEventAction } from "@/app/actions/local";
import { SubmitButton } from "@/components/forms/submit-button";
import { PreciseLocationPicker } from "@/components/precise-location-picker";
import { serializeVipSpace } from "@/lib/vip-space";

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

export function CreateEventForm() {
  const [state, formAction] = useActionState(createEventAction, initialState);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [hasReservations, setHasReservations] = useState(false);
  const [isAdultsOnly, setIsAdultsOnly] = useState(false);
  const [vipHowItIs, setVipHowItIs] = useState("");
  const [vipPrice, setVipPrice] = useState("");
  const [vipIncludes, setVipIncludes] = useState("");
  const [vipDescription, setVipDescription] = useState("");
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
  const serializedVipSpace = serializeVipSpace({
    howItIs: vipHowItIs,
    price: vipPrice,
    includes: vipIncludes,
    description: vipDescription,
    adultsOnly: isAdultsOnly,
  });

  return (
    <form action={formAction} encType="multipart/form-data" className="grid gap-4">
      <input type="hidden" name="ticketTypes" value={serializedTicketTypes} />

      <FieldCard
        icon={<CalendarDays className="h-5 w-5" />}
        title="Informacion basica"
        description="Ponle un nombre claro al plan y explica que va a encontrar la gente al llegar."
      >
        <div className="grid gap-3">
          <div className="grid gap-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Titulo</p>
            <input name="title" className="app-input" placeholder="Ej. Fiesta universitaria con DJ invitado" />
          </div>
          <textarea
            name="description"
            className="app-input min-h-32 resize-none"
            placeholder="Cuenta el ambiente, artistas, tipo de musica, dress code, promociones, consumiciones o cualquier detalle importante."
          />
          <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={isAdultsOnly} onChange={(event) => setIsAdultsOnly(event.target.checked)} />
              Este evento es +18
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={hasReservations}
                onChange={(event) => setHasReservations(event.target.checked)}
              />
              Este evento tiene Espacio VIP
            </label>
            <p className="mt-3 text-sm text-slate-500">
              Rellena esto solo si el local ofrece reservados o mesas VIP. En la ficha del evento se mostrara tambien
              el texto: &quot;Para adquirir un espacio VIP, contacta con:&quot; seguido del telefono del local.
            </p>
            <input type="hidden" name="hasReservations" value={hasReservations ? "true" : "false"} />
            <input type="hidden" name="reservationInfo" value={serializedVipSpace} />
            {hasReservations ? (
              <div className="mt-3 grid gap-3">
                <input
                  className="app-input"
                  placeholder="Ej. Mesa privada para 6 personas junto a cabina"
                  value={vipHowItIs}
                  onChange={(event) => setVipHowItIs(event.target.value)}
                />
                <input
                  className="app-input"
                  placeholder="Ej. 120 EUR o consumo minimo 150 EUR"
                  value={vipPrice}
                  onChange={(event) => setVipPrice(event.target.value)}
                />
                <input
                  className="app-input"
                  placeholder="Ej. Botella premium, refrescos y acceso prioritario"
                  value={vipIncludes}
                  onChange={(event) => setVipIncludes(event.target.value)}
                />
                <textarea
                  className="app-input min-h-24 resize-none"
                  placeholder="Anade condiciones, horario, zonas disponibles o cualquier aclaracion para quien quiera reservar."
                  value={vipDescription}
                  onChange={(event) => setVipDescription(event.target.value)}
                />
              </div>
            ) : null}
          </div>
        </div>
      </FieldCard>

      <FieldCard
        icon={<Clock3 className="h-5 w-5" />}
        title="Fecha y horario"
        description="Marca el dia del evento y las horas reales de apertura y cierre."
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
        description="Configura cada tipo de entrada con nombre, precio, aforo y periodo de venta. La descripcion de la principal es la que mas vera la gente."
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
                    placeholder="Ej. Entrada general"
                    value={ticketType.name}
                    onChange={(event) => updateTicketType(ticketType.id, "name", event.target.value)}
                  />
                  <input
                    className="app-input"
                    placeholder="Ej. Acceso hasta las 02:00"
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
                    placeholder="Precio en EUR"
                    value={ticketType.price}
                    onChange={(event) => updateTicketType(ticketType.id, "price", event.target.value)}
                  />
                  <input
                    className="app-input"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Aforo de esta entrada"
                    value={ticketType.capacity}
                    onChange={(event) => updateTicketType(ticketType.id, "capacity", event.target.value)}
                  />
                  <input
                    className="app-input"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Consumiciones incluidas"
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
                  Mostrar este tipo de entrada al publico
                </label>
              </div>
            </div>
          ))}

          <button type="button" onClick={addTicketType} className="app-button-secondary w-full">
            <Plus className="h-4 w-4" />
            Anadir otro tipo de entrada
          </button>
        </div>
      </FieldCard>

      <FieldCard
        icon={<MapPin className="h-5 w-5" />}
        title="Ubicacion"
        description="Pon la direccion exacta del evento para que el anuncio aparezca correctamente en el mapa y en los filtros."
      >
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="location"
              className="app-input"
              placeholder="Ej. Calle Velazquez 12"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
            <input
              name="city"
              className="app-input"
              placeholder="Ciudad del evento"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </div>

          <PreciseLocationPicker
            searchQuery={[location, city].filter(Boolean).join(", ")}
            helperText="Busca la calle exacta o usa tu ubicacion actual para guardar el punto con precision."
          />
        </div>
      </FieldCard>

      <FieldCard
        icon={<ImagePlus className="h-5 w-5" />}
        title="Imagen del evento"
        description="Sube el cartel o portada que vera la gente en el mapa, en el feed y al abrir el evento."
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
          <p className="mt-2 text-sm text-slate-500">PNG, JPG o WEBP hasta 5MB. Mejor si es un cartel vertical o una portada limpia.</p>
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
