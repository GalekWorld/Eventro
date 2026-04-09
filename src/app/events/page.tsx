import { EventCard } from "@/components/event-card";
import { listPublishedEvents } from "@/features/events/event.service";

type SearchParams = Promise<{
  city?: string;
  location?: string;
  price?: "all" | "free" | "paid";
}>;

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const events = await listPublishedEvents({
    city: params.city,
    location: params.location,
    price: params.price ?? "all",
  });

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      <section className="app-card p-5">
        <h1 className="app-screen-title">Explorar eventos</h1>
        <p className="mt-2 app-screen-subtitle">Un feed de planes más visual y social, con filtros rápidos y estilo móvil.</p>
      </section>

      <section className="app-card p-4">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_220px_160px]">
          <input name="city" placeholder="Ciudad" defaultValue={params.city} className="app-input" />
          <input name="location" placeholder="Barrio, sala o zona" defaultValue={params.location} className="app-input" />
          <select name="price" defaultValue={params.price ?? "all"} className="app-input">
            <option value="all">Todos</option>
            <option value="free">Gratis</option>
            <option value="paid">De pago</option>
          </select>
          <button className="app-button-primary" type="submit">
            Filtrar
          </button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}

        {events.length === 0 ? <div className="app-card p-5 text-sm text-slate-500">No hay eventos con esos filtros.</div> : null}
      </section>
    </div>
  );
}

