import Link from "next/link";
import { notFound } from "next/navigation";
import { EditEventForm } from "@/components/forms/edit-event-form";
import { getVenueEventById } from "@/features/events/event.service";
import { requireRole } from "@/lib/permissions";

export default async function EditLocalEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const venue = await requireRole(["VENUE"]);
  const event = await getVenueEventById(eventId, venue.id);

  if (!event) notFound();

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      <section className="app-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="app-screen-title">Editar evento</h1>
            <p className="mt-2 app-screen-subtitle">{event.title}</p>
          </div>
          <Link href={`/local/events/${event.id}/tickets`} className="app-button-secondary">
            Volver al control
          </Link>
        </div>
      </section>

      <EditEventForm event={event} />
    </div>
  );
}
