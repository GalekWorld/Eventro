import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/permissions";
import { getScannableEventById } from "@/features/events/event.service";
import { TicketValidationForm } from "@/components/forms/ticket-validation-form";
import { formatEventDate } from "@/lib/utils";

export default async function ScannerEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await requireAuth();
  const event = await getScannableEventById({
    eventId,
    scannerUserId: user.id,
    role: user.role,
  });

  if (!event) notFound();

  return (
    <div className="mx-auto max-w-[760px] space-y-4">
      <section className="app-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="app-screen-title">Escanear entrada</h1>
            <p className="mt-2 app-screen-subtitle">{event.title}</p>
            <p className="mt-1 text-sm text-slate-500">
              {event.owner.username ? `@${event.owner.username}` : event.owner.name ?? "local"} · {formatEventDate(event.date)}
            </p>
          </div>
          <Link href="/scanner" className="app-button-secondary">
            Volver
          </Link>
        </div>
      </section>

      <TicketValidationForm eventId={event.id} />
    </div>
  );
}
