import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import {
  getRangeStart,
  getVenueDashboardDataset,
  isWithinRange,
  normalizeRange,
} from "@/lib/local-dashboard";

function escapeCsv(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const user = await requireRole(["VENUE"]);
  const { searchParams } = new URL(request.url);
  const range = normalizeRange(searchParams.get("range") ?? undefined);
  const selectedCity = searchParams.get("city")?.trim() ?? "";
  const selectedEventId = searchParams.get("eventId")?.trim() ?? "";
  const rangeStart = getRangeStart(range);

  const { events, purchases, views } = await getVenueDashboardDataset(user.id);
  const filteredEvents = events.filter((event) => {
    if (selectedCity && event.city !== selectedCity) return false;
    if (selectedEventId && event.id !== selectedEventId) return false;
    return true;
  });
  const allowedEventIds = new Set(filteredEvents.map((event) => event.id));

  const rows = purchases
    .filter((purchase) => {
      if (!allowedEventIds.has(purchase.eventId)) return false;
      return isWithinRange(new Date(purchase.createdAt), rangeStart);
    })
    .map((purchase) => {
      const eventViews = views.filter((view) => view.eventId === purchase.eventId && isWithinRange(new Date(view.viewedOn), rangeStart)).length;
      return [
        purchase.createdAt.toISOString(),
        purchase.event.title,
        purchase.event.city,
        purchase.ticketType.name,
        purchase.buyer.username ?? purchase.buyer.name ?? "usuario",
        purchase.quantity,
        purchase.totalAmount == null ? 0 : Number(purchase.totalAmount),
        eventViews,
      ];
    });

  const header = [
    "fecha_compra",
    "evento",
    "ciudad",
    "tipo_entrada",
    "comprador",
    "cantidad",
    "importe_total",
    "visitas_evento_rango",
  ];

  const csv = [header, ...rows].map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eventro-local-dashboard-${range}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
