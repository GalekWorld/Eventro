import Link from "next/link";
import { CalendarClock, MapPin } from "lucide-react";
import { getEventPath } from "@/lib/event-path";
import { formatEventDate, formatPrice } from "@/lib/utils";

export type EventCardData = {
  id: string;
  slug?: string | null;
  title: string;
  imageUrl: string | null;
  location: string;
  city: string;
  date: Date | string;
  price?: unknown;
  description?: string | null;
};

export function EventCard({ event }: { event: EventCardData }) {
  const displayPrice = event.price == null ? "Gratis" : `Desde ${formatPrice(Number(event.price))}`;

  return (
    <Link href={getEventPath(event)} className="app-card block overflow-hidden rounded-[18px] transition hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
      <div className="aspect-[4/3] bg-neutral-100">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" loading="lazy" />
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{event.city}</p>
            <h3 className="mt-1 text-lg font-semibold leading-tight text-slate-950">{event.title}</h3>
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
