import { db } from "@/lib/db";

export type RangeKey = "7d" | "30d" | "90d" | "all";

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function addDays(date: Date, amount: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + amount);
  return value;
}

export function normalizeRange(value?: string): RangeKey {
  if (value === "7d" || value === "30d" || value === "90d" || value === "all") return value;
  return "30d";
}

export function getRangeStart(range: RangeKey) {
  const today = startOfDay(new Date());
  if (range === "7d") return addDays(today, -6);
  if (range === "30d") return addDays(today, -29);
  if (range === "90d") return addDays(today, -89);
  return null;
}

export function isWithinRange(date: Date, start: Date | null) {
  if (!start) return true;
  return date >= start;
}

export function getRangeLength(range: RangeKey) {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  if (range === "90d") return 90;
  return 14;
}

export async function getVenueDashboardDataset(venueId: string) {
  const [events, purchases, views, ticketTypes] = await Promise.all([
    db.event.findMany({
      where: { ownerId: venueId },
      orderBy: [{ published: "desc" }, { date: "asc" }],
      select: {
        id: true,
        title: true,
        city: true,
        date: true,
        published: true,
      },
    }),
    db.ticketPurchase.findMany({
      where: {
        status: "CONFIRMED",
        event: {
          ownerId: venueId,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        buyer: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            city: true,
          },
        },
        ticketType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    db.eventView.findMany({
      where: {
        event: {
          ownerId: venueId,
        },
      },
      orderBy: { viewedOn: "desc" },
      select: {
        eventId: true,
        viewedOn: true,
      },
    }),
    db.eventTicketType.findMany({
      where: {
        event: {
          ownerId: venueId,
        },
      },
      select: {
        id: true,
        name: true,
        soldCount: true,
        capacity: true,
        price: true,
        event: {
          select: {
            id: true,
            title: true,
            city: true,
          },
        },
      },
    }),
  ]);

  return { events, purchases, views, ticketTypes };
}
