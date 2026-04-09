import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, CheckCircle2, MapPin, Ticket } from "lucide-react";
import { requireAuth } from "@/lib/permissions";
import { getTicketById } from "@/features/events/event.service";
import { getEventPath } from "@/lib/event-path";
import { getTicketQrDataUrl } from "@/lib/ticket-qr";
import { formatEventDate, formatPrice } from "@/lib/utils";
import { TicketDownloadActions } from "@/components/ticket-download-actions";

export default async function TicketDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const user = await requireAuth();
  const ticket = await getTicketById(ticketId, user.id);

  if (!ticket) notFound();

  const qrDataUrl = await getTicketQrDataUrl(ticket.qrCode);
  const ticketPriceLabel = ticket.ticketType.price == null ? "Gratis" : formatPrice(Number(ticket.ticketType.price)) ?? "Gratis";

  return (
    <div className="mx-auto max-w-[560px] space-y-4">
      <section className="app-card overflow-hidden rounded-[28px]">
        <div className="border-b border-neutral-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-500">
                {ticket.event.owner.username ? `@${ticket.event.owner.username}` : ticket.event.owner.name ?? "local"}
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-950">{ticket.event.title}</h1>
            </div>
            <span className={`app-pill shrink-0 ${ticket.status === "USED" ? "bg-emerald-50 text-emerald-700" : ""}`}>
              {ticket.status === "USED" ? "Usada" : "Activa"}
            </span>
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-5">
          <div className="overflow-hidden rounded-[24px] border border-neutral-200 bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`QR ${ticket.qrCode}`} className="mx-auto h-auto w-full max-w-[320px]" />
            <p className="mt-3 break-all text-center text-sm font-semibold tracking-[0.18em] text-slate-600">{ticket.qrCode}</p>
          </div>

          <TicketDownloadActions
            title={ticket.event.title}
            venueLabel={ticket.event.owner.username ? `@${ticket.event.owner.username}` : ticket.event.owner.name ?? "local"}
            ticketName={ticket.ticketType.name}
            ticketPriceLabel={ticketPriceLabel}
            includedDrinks={ticket.ticketType.includedDrinks}
            description={ticket.ticketType.description}
            dateLabel={formatEventDate(ticket.event.date)}
            locationLabel={`${ticket.event.location}, ${ticket.event.city}`}
            qrCode={ticket.qrCode}
            qrDataUrl={qrDataUrl}
            statusLabel={ticket.status === "USED" ? "Usada" : "Activa"}
          />

          <div className="grid gap-3 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                {ticket.ticketType.name} · {ticketPriceLabel}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>{ticket.ticketType.includedDrinks} consumiciones incluidas</span>
            </div>
            {ticket.ticketType.description ? <div className="text-sm text-slate-600">{ticket.ticketType.description}</div> : null}
            <div className="flex items-start gap-2">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>{formatEventDate(ticket.event.date)}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                {ticket.event.location}, {ticket.event.city}
              </span>
            </div>
            {ticket.validatedAt ? (
              <div className="flex items-start gap-2 text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Validada el {new Date(ticket.validatedAt).toLocaleString("es-ES")}
                  {ticket.validatedBy ? ` por @${ticket.validatedBy.username ?? ticket.validatedBy.name ?? "local"}` : ""}
                </span>
              </div>
            ) : null}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Entrada final. No se admiten devoluciones ni reembolsos.
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/tickets" className="app-button-primary w-full text-center">
              Volver a mis entradas
            </Link>
            <Link href={getEventPath(ticket.event)} className="app-button-secondary w-full text-center">
              Ver evento
            </Link>
            <Link href={`/events/${ticket.event.slug ?? ticket.event.id}/chat`} className="app-button-secondary w-full text-center">
              Chat del evento
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
