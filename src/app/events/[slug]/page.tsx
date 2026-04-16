import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, MapPin, Ticket } from "lucide-react";
import { canUserAccessEventChat, getPublishedEventBySlug, isTicketTypeOnSale } from "@/features/events/event.service";
import { getSessionUser } from "@/lib/auth";
import { formatEventDate, formatPrice } from "@/lib/utils";
import { VerifiedBadge } from "@/components/verified-badge";
import { getVerificationTone, isPubliclyVerified } from "@/lib/user-display";
import { TicketPurchaseForm } from "@/components/forms/ticket-purchase-form";
import { registerEventView } from "@/lib/analytics";
import { EventShareButton } from "@/components/event-share-button";
import { getPrimaryTicketSummary } from "@/lib/event-pricing";
import { hasVipSpaceDetails, parseVipSpace } from "@/lib/vip-space";

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);

  if (!event) notFound();

  const user = await getSessionUser();
  await registerEventView({ eventId: event.id, viewerId: user?.id });
  const hasEventChatAccess = user
    ? await canUserAccessEventChat({
        eventId: event.id,
        userId: user.id,
        role: user.role,
        ownerId: event.owner.id,
      })
    : false;
  const pricing = getPrimaryTicketSummary(event);
  const canSeeInventory = Boolean(user && (user.role === "ADMIN" || user.id === event.owner.id));
  const vipSpace = parseVipSpace(event.reservationInfo);
  const ticketLabel =
    event.ticketCapacity == null
      ? "Aforo sin límite definido"
      : `${Math.max(event.ticketCapacity - event.ticketsSold, 0)} de ${event.ticketCapacity} entradas disponibles`;

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      <section className="app-card overflow-hidden rounded-[18px]">
        <div className="aspect-[4/3] bg-neutral-100 md:aspect-[16/7]">
          {event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
          ) : null}
        </div>

        <div className="space-y-5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
                <p className="truncate">{event.owner.username ? `@${event.owner.username}` : event.owner.name ?? "local"}</p>
                {isPubliclyVerified(event.owner) ? <VerifiedBadge tone={getVerificationTone(event.owner)} /> : null}
              </div>
              <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">{event.title}</h1>
            </div>
            {isPubliclyVerified(event.owner) ? <span className="app-pill shrink-0">Verificado</span> : null}
          </div>

          {pricing.message ? <p className="text-sm font-medium text-slate-700">{pricing.message}</p> : null}
          {vipSpace?.adultsOnly ? <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-600">Evento +18</p> : null}

          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                {formatEventDate(event.date)}
                {event.endDate ? ` · hasta ${formatEventDate(event.endDate)}` : ""}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                {event.location}, {event.city}
              </span>
            </div>
            {canSeeInventory ? (
              <div className="flex items-start gap-2">
                <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>{ticketLabel}</span>
              </div>
            ) : null}
            {event.hasReservations && hasVipSpaceDetails(vipSpace) ? (
              <div className="flex items-start gap-2">
                <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-500" />
                <div className="space-y-1">
                  <p className="font-medium text-fuchsia-700">Espacio VIP: {vipSpace?.howItIs || "disponible"}</p>
                  {vipSpace?.price ? <p>Precio: {vipSpace.price}</p> : null}
                  {vipSpace?.includes ? <p>Incluye: {vipSpace.includes}</p> : null}
                  {vipSpace?.description ? <p>{vipSpace.description}</p> : null}
                </div>
              </div>
            ) : null}
          </div>

          <p className="text-sm leading-7 text-slate-600">{event.description ?? "Este evento no tiene descripción."}</p>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Las entradas son finales y no admiten devolución bajo ningún concepto.
          </div>

          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-950">Entradas</h2>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Venta real por tipo</span>
            </div>

            <div className="grid gap-3">
              {event.ticketTypes.filter((ticketType) => canSeeInventory || ticketType.isVisible).map((ticketType) => {
                const available = Math.max(ticketType.capacity - ticketType.soldCount, 0);
                const onSale = isTicketTypeOnSale(ticketType);
                const isHidden = !ticketType.isVisible;

                return (
                  <article key={ticketType.id} className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-slate-950">{ticketType.name}</p>
                        {ticketType.description ? <p className="mt-1 text-sm text-slate-500">{ticketType.description}</p> : null}
                      </div>
                      <span className="app-pill shrink-0">{ticketType.price == null ? "Gratis" : formatPrice(Number(ticketType.price))}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      {canSeeInventory ? <span className="app-pill">{available} disponibles</span> : null}
                      <span className="app-pill">{ticketType.includedDrinks} consumiciones</span>
                      {ticketType.salesStart ? <span className="app-pill">Desde {formatEventDate(ticketType.salesStart)}</span> : null}
                      {ticketType.salesEnd ? <span className="app-pill">Hasta {formatEventDate(ticketType.salesEnd)}</span> : null}
                      {isHidden ? <span className="app-pill bg-amber-50 text-amber-700">Oculta al público</span> : !onSale ? <span className="app-pill">Fuera de venta</span> : null}
                    </div>

                    {user ? (
                      isHidden && !canSeeInventory ? null : available < 1 ? (
                        <p className="mt-4 text-sm font-medium text-red-600">Entradas agotadas.</p>
                      ) : !onSale ? (
                        <p className="mt-4 text-sm font-medium text-slate-500">Esta entrada no está disponible ahora mismo.</p>
                      ) : (
                        <TicketPurchaseForm
                          eventId={event.id}
                          ticketTypeId={ticketType.id}
                          available={available}
                          unitPrice={ticketType.price == null ? null : Number(ticketType.price)}
                          ownerMode={user.id === event.owner.id && user.role === "VENUE"}
                        />
                      )
                    ) : (
                      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-slate-500">
                        Inicia sesión para conseguir tus entradas.
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-4">
            <Link href="/events" className="app-button-primary w-full text-center">
              Volver a eventos
            </Link>
            <EventShareButton title={event.title} path={`/events/${event.slug ?? event.id}`} />
            <Link
              href={hasEventChatAccess ? `/events/${event.slug ?? event.id}/chat` : user ? "/tickets" : "/login"}
              className="app-button-secondary w-full text-center"
            >
              {hasEventChatAccess ? "Entrar al chat" : user ? "Ver mis entradas" : "Inicia sesión"}
            </Link>
            {event.owner.username ? (
              <Link href={`/u/${event.owner.username}`} className="app-button-secondary w-full text-center">
                Ver local
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
