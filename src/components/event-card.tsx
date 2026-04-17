import Link from "next/link";
import { CalendarClock, MapPin } from "lucide-react";
import { getEventPath } from "@/lib/event-path";
import { formatEventDate, formatPrice } from "@/lib/utils";
import { getPrimaryTicketSummary } from "@/lib/event-pricing";
import { parseVipSpace } from "@/lib/vip-space";

export type EventCardData = {
  id: string;
  slug?: string | null;
  title: string;
  imageUrl: string | null;
  hasReservations?: boolean;
  reservationInfo?: string | null;
  location: string;
  city: string;
  date: Date | string;
  price?: unknown;
  description?: string | null;
  ticketTypes?: Array<{
    name: string;
    description?: string | null;
    price?: unknown;
    isVisible?: boolean;
  }>;
};

export function EventCard({ event }: { event: EventCardData }) {
  const pricing = getPrimaryTicketSummary(event);
  const displayPrice = pricing.price == null ? "Gratis" : `Desde ${formatPrice(pricing.price) ?? "Gratis"}`;
  const vipSpace = parseVipSpace(event.reservationInfo);

  return (
    <Link href={getEventPath(event)} className="app-card block overflow-hidden rounded-[18px] transition hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
      <div className="aspect-[4/3] bg-neutral-100">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{event.city}</p>
            <h3 className="mt-1 text-lg font-semibold leading-tight text-slate-950">{event.title}</h3>
            {pricing.message ? <p className="mt-1 line-clamp-2 text-sm text-slate-500">{pricing.message}</p> : null}
            {vipSpace?.adultsOnly ? <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-rose-600">+18</p> : null}
            {event.hasReservations ? (
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-fuchsia-600">Espacio VIP disponible</p>
            ) : null}
          </div>
          <span className="app-pill">{displayPrice}</span>
        </div>

        <div className="space-y-2 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            <span>{formatEventDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{event.location}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
