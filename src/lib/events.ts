import { prisma } from "@/lib/prisma"

type ListPublishedEventsOptions = {
  price?: "all" | "free" | "paid"
}

export async function listPublishedEvents(
  options: ListPublishedEventsOptions = {}
) {
  const price = options.price ?? "all"

  const where =
    price === "free"
      ? {
          published: true,
          OR: [
            { price: null },
            { price: 0 },
          ],
        }
      : price === "paid"
        ? {
            published: true,
            price: {
              gt: 0,
            },
          }
        : {
            published: true,
          }

  const events = await prisma.event.findMany({
    where,
    orderBy: {
      date: "asc",
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      imageUrl: true,
      location: true,
      city: true,
      date: true,
      price: true,
      published: true,
      createdAt: true,
    },
  })

  return events.map((event) => ({
    id: event.id,
    title: event.title,
    slug: event.slug ?? event.id,
    description: event.description,
    coverImageUrl: event.imageUrl,
    eventType: null,
    zone: event.city,
    address: event.location,
    startsAt: event.date,
    pricingMode:
      event.price === null || Number(event.price) === 0 ? "free" : "paid",
    priceFrom: event.price ? Number(event.price) : 0,
    capacity: null,
    published: event.published,
    createdAt: event.createdAt,
  }))
}
