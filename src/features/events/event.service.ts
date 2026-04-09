import { randomBytes } from "crypto";
import { PaymentCheckoutStatus, PaymentProvider, Prisma, TicketAccessAction } from "@prisma/client";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { DEFAULT_PAYMENT_CURRENCY, calculateCheckoutAmounts } from "@/lib/payments";
import { USER_ROLE, type UserRole } from "@/lib/roles";
import type { CreateEventInput, EventFilters } from "@/features/events/event.schemas";

function getEventSummary(ticketTypes: CreateEventInput["ticketTypes"]) {
  const cheapestPaid = ticketTypes
    .filter((ticketType) => ticketType.isVisible)
    .map((ticketType) => ticketType.price)
    .sort((a, b) => a - b)[0];

  const totalCapacity = ticketTypes.reduce((sum, ticketType) => sum + ticketType.capacity, 0);

  return {
    price: cheapestPaid && cheapestPaid > 0 ? cheapestPaid : null,
    ticketCapacity: totalCapacity > 0 ? totalCapacity : null,
  };
}

function buildTicketCode() {
  return `EVT-${randomBytes(8).toString("hex").toUpperCase()}`;
}

async function generateUniqueEventSlug(title: string) {
  const baseSlug = slugify(title) || `evento-${Date.now()}`;
  let slug = baseSlug;
  let counter = 2;

  while (await db.event.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

export function isTicketTypeOnSale(ticketType: {
  salesStart: Date | null;
  salesEnd: Date | null;
  isVisible: boolean;
}) {
  const now = new Date();

  if (!ticketType.isVisible) return false;
  if (ticketType.salesStart && ticketType.salesStart > now) return false;
  if (ticketType.salesEnd && ticketType.salesEnd < now) return false;

  return true;
}

export async function listPublishedEvents(filters: EventFilters) {
  const where: Prisma.EventWhereInput = {
    published: true,
  };

  if (filters.city) {
    where.city = { contains: filters.city, mode: "insensitive" };
  }

  if (filters.location) {
    where.location = { contains: filters.location, mode: "insensitive" };
  }

  if (filters.price === "free") {
    where.price = null;
  }

  if (filters.price === "paid") {
    where.price = { not: null };
  }

  return db.event.findMany({
    where,
    orderBy: { date: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      imageUrl: true,
      location: true,
      city: true,
      latitude: true,
      longitude: true,
      date: true,
      endDate: true,
      price: true,
      ticketCapacity: true,
      ticketsSold: true,
      ticketTypes: {
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          price: true,
          capacity: true,
          includedDrinks: true,
          soldCount: true,
        },
      },
    },
  });
}

export async function getPublishedEventBySlug(slug: string) {
  return db.event.findFirst({
    where: {
      published: true,
      OR: [{ slug }, { id: slug }],
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          username: true,
          isVerified: true,
          role: true,
        },
      },
      ticketTypes: {
        orderBy: { sortOrder: "asc" },
      },
      purchases: {
        where: { status: "CONFIRMED" },
        select: {
          id: true,
        },
      },
    },
  });
}

export async function getEventChatBySlugForUser({
  slug,
  userId,
  role,
}: {
  slug: string;
  userId: string;
  role: UserRole;
}) {
  const event = await db.event.findFirst({
    where: {
      published: true,
      OR: [{ slug }, { id: slug }],
    },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          name: true,
          isVerified: true,
          role: true,
        },
      },
      chatParticipants: {
        where: { userId },
        select: {
          id: true,
          lastReadAt: true,
        },
      },
      chatMessages: {
        where: { hiddenAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              isVerified: true,
              role: true,
            },
          },
        },
      },
      _count: {
        select: {
          chatParticipants: true,
        },
      },
    },
  });

  if (!event) return null;

  const accessWindowEndsAt = new Date((event.endDate ?? event.date).getTime() + 12 * 60 * 60 * 1000);
  const hasAccess = role === USER_ROLE.ADMIN || event.ownerId === userId || event.chatParticipants.length > 0;

  if (!hasAccess) {
    return null;
  }

  return {
    ...event,
    participant: event.chatParticipants[0] ?? null,
    isChatOpen: new Date() <= accessWindowEndsAt,
    accessWindowEndsAt,
  };
}

export async function getVenueEventById(eventId: string, ownerId: string) {
  return db.event.findFirst({
    where: {
      id: eventId,
      ownerId,
    },
    include: {
      ticketTypes: {
        orderBy: { sortOrder: "asc" },
      },
      doorStaff: {
        where: {
          OR: [{ eventId: null }, { eventId: eventId }],
        },
        include: {
          staffUser: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
      },
      purchases: {
        where: { status: "CONFIRMED" },
        orderBy: { createdAt: "desc" },
        include: {
          buyer: {
            select: {
              username: true,
              name: true,
            },
          },
          ticketType: {
            select: {
              name: true,
              description: true,
              includedDrinks: true,
            },
          },
          tickets: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              qrCode: true,
              status: true,
              consumedDrinks: true,
              validatedAt: true,
            },
          },
        },
      },
      tickets: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          buyer: {
            select: {
              username: true,
              name: true,
            },
          },
          ticketType: {
            select: {
              name: true,
              description: true,
              includedDrinks: true,
            },
          },
        },
      },
      ticketAccessLogs: {
        orderBy: { createdAt: "desc" },
        take: 25,
        include: {
          actor: {
            select: {
              username: true,
              name: true,
            },
          },
          ticket: {
            select: {
              qrCode: true,
              buyer: {
                select: {
                  username: true,
                  name: true,
                },
              },
              ticketType: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function listScannerEvents(scannerUserId: string, role: UserRole) {
  if (role === USER_ROLE.ADMIN) {
    return db.event.findMany({
      where: {
        published: true,
        date: {
          gte: new Date(Date.now() - 12 * 60 * 60 * 1000),
        },
      },
      orderBy: { date: "asc" },
      take: 30,
      include: {
        owner: {
          select: {
            username: true,
            name: true,
          },
        },
      },
    });
  }

  const assignments = await db.venueDoorStaff.findMany({
    where: {
      staffUserId: scannerUserId,
    },
    select: {
      venueId: true,
      eventId: true,
    },
  });

  if (assignments.length === 0) {
    return [];
  }

  const explicitEventIds = assignments.map((item) => item.eventId).filter(Boolean) as string[];
  const venueIds = [...new Set(assignments.map((item) => item.venueId))];

  return db.event.findMany({
    where: {
      published: true,
      date: {
        gte: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
      OR: [
        explicitEventIds.length ? { id: { in: explicitEventIds } } : undefined,
        { ownerId: { in: venueIds } },
      ].filter(Boolean) as Prisma.EventWhereInput[],
    },
    orderBy: { date: "asc" },
    include: {
      owner: {
        select: {
          username: true,
          name: true,
        },
      },
    },
  });
}

export async function getScannableEventById({
  eventId,
  scannerUserId,
  role,
}: {
  eventId: string;
  scannerUserId: string;
  role: UserRole;
}) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
    },
  });

  if (!event) return null;
  if (role === USER_ROLE.ADMIN) return event;

  const assignment = await db.venueDoorStaff.findFirst({
    where: {
      venueId: event.ownerId,
      staffUserId: scannerUserId,
      OR: [{ eventId: null }, { eventId }],
    },
    select: { id: true },
  });

  return assignment ? event : null;
}

export async function createEventForLocal(ownerId: string, input: CreateEventInput) {
  const summary = getEventSummary(input.ticketTypes);

  return db.event.create({
    data: {
      ownerId,
      title: input.title,
      slug: await generateUniqueEventSlug(input.title),
      description: input.description,
      imageUrl: input.imageUrl || null,
      location: input.location,
      city: input.city,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      date: new Date(input.date),
      endDate: input.endDate ? new Date(input.endDate) : null,
      price: summary.price,
      ticketCapacity: summary.ticketCapacity,
      published: input.published,
      ticketTypes: {
        create: input.ticketTypes.map((ticketType, index) => ({
          name: ticketType.name,
          description: ticketType.description || null,
          price: ticketType.price > 0 ? ticketType.price : null,
          capacity: ticketType.capacity,
          includedDrinks: ticketType.includedDrinks,
          salesStart: ticketType.salesStart ? new Date(ticketType.salesStart) : null,
          salesEnd: ticketType.salesEnd ? new Date(ticketType.salesEnd) : null,
          isVisible: ticketType.isVisible,
          sortOrder: index,
        })),
      },
    },
  });
}

export async function purchaseTicketsForEvent({
  buyerId,
  eventId,
  ticketTypeId,
  quantity,
  checkoutId,
}: {
  buyerId: string;
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  checkoutId?: string;
}) {
  return db.$transaction(async (tx) => {
    const ticketType = await tx.eventTicketType.findFirst({
      where: {
        id: ticketTypeId,
        eventId,
        event: {
          published: true,
        },
      },
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
            ownerId: true,
            date: true,
          },
        },
      },
    });

    if (!ticketType) {
      throw new Error("Ese tipo de entrada ya no existe.");
    }

    if (ticketType.event.ownerId === buyerId) {
      throw new Error("No puedes comprar entradas para tu propio evento.");
    }

    if (!isTicketTypeOnSale(ticketType)) {
      throw new Error("Esta entrada no está disponible ahora mismo.");
    }

    const available = ticketType.capacity - ticketType.soldCount;
    if (available < quantity) {
      throw new Error("No quedan suficientes entradas disponibles.");
    }

    const totalAmount =
      ticketType.price == null ? null : new Prisma.Decimal(ticketType.price).mul(new Prisma.Decimal(quantity));

    const purchase = await tx.ticketPurchase.create({
      data: {
        checkoutId: checkoutId ?? null,
        buyerId,
        eventId,
        ticketTypeId,
        quantity,
        totalAmount,
      },
    });

    await tx.eventChatParticipant.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId: buyerId,
        },
      },
      update: {},
      create: {
        eventId,
        userId: buyerId,
      },
    });

    const tickets = await Promise.all(
      Array.from({ length: quantity }).map(() =>
        tx.eventTicket.create({
          data: {
            purchaseId: purchase.id,
            eventId,
            ticketTypeId,
            buyerId,
            qrCode: buildTicketCode(),
          },
        }),
      ),
    );

    await tx.eventTicketType.update({
      where: { id: ticketTypeId },
      data: {
        soldCount: {
          increment: quantity,
        },
      },
    });

    await tx.event.update({
      where: { id: eventId },
      data: {
        ticketsSold: {
          increment: quantity,
        },
      },
    });

    return {
      purchase,
      tickets,
      event: ticketType.event,
      ticketType,
    };
  });
}

export async function prepareTicketCheckout({
  buyerId,
  eventId,
  ticketTypeId,
  quantity,
}: {
  buyerId: string;
  eventId: string;
  ticketTypeId: string;
  quantity: number;
}) {
  const ticketType = await db.eventTicketType.findFirst({
    where: {
      id: ticketTypeId,
      eventId,
      event: {
        published: true,
      },
    },
    include: {
      event: {
        select: {
          id: true,
          slug: true,
          title: true,
          ownerId: true,
          date: true,
          owner: {
            select: {
              id: true,
              stripeConnectedAccountId: true,
            },
          },
        },
      },
    },
  });

  if (!ticketType) {
    throw new Error("Ese tipo de entrada ya no existe.");
  }

  if (ticketType.event.ownerId === buyerId) {
    throw new Error("No puedes comprar entradas para tu propio evento.");
  }

  if (!isTicketTypeOnSale(ticketType)) {
    throw new Error("Esta entrada no está disponible ahora mismo.");
  }

  const available = ticketType.capacity - ticketType.soldCount;
  if (available < quantity) {
    throw new Error("No quedan suficientes entradas disponibles.");
  }

  const unitAmount = ticketType.price == null ? 0 : Number(ticketType.price) * 100;
  const amounts = calculateCheckoutAmounts(unitAmount, quantity);

  return {
    ticketType,
    event: ticketType.event,
    quantity,
    currency: DEFAULT_PAYMENT_CURRENCY,
    ...amounts,
  };
}

export async function createPaymentCheckout({
  provider,
  buyerId,
  eventId,
  ticketTypeId,
  quantity,
  currency,
  baseAmount,
  revenueShareAmount,
  managementFeeAmount,
  applicationFeeAmount,
  totalAmount,
  stripeCheckoutSessionId,
  expiresAt,
}: {
  provider: PaymentProvider;
  buyerId: string;
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  currency: string;
  baseAmount: number;
  revenueShareAmount: number;
  managementFeeAmount: number;
  applicationFeeAmount: number;
  totalAmount: number;
  stripeCheckoutSessionId?: string;
  expiresAt?: Date;
}) {
  return db.paymentCheckout.create({
    data: {
      provider,
      buyerId,
      eventId,
      ticketTypeId,
      quantity,
      currency,
      baseAmount,
      revenueShareAmount,
      managementFeeAmount,
      applicationFeeAmount,
      totalAmount,
      stripeCheckoutSessionId,
      expiresAt: expiresAt ?? null,
    },
  });
}

export async function completePaymentCheckout(checkoutId: string, stripePaymentIntentId?: string | null) {
  const checkout = await db.paymentCheckout.findUnique({
    where: { id: checkoutId },
    include: {
      purchase: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!checkout) {
    throw new Error("Checkout no encontrado.");
  }

  if (checkout.purchase) {
    if (checkout.status !== PaymentCheckoutStatus.COMPLETED) {
      await db.paymentCheckout.update({
        where: { id: checkout.id },
        data: {
          status: PaymentCheckoutStatus.COMPLETED,
          stripePaymentIntentId: stripePaymentIntentId ?? undefined,
          completedAt: checkout.completedAt ?? new Date(),
        },
      });
    }

    return checkout;
  }

  const result = await purchaseTicketsForEvent({
    buyerId: checkout.buyerId,
    eventId: checkout.eventId,
    ticketTypeId: checkout.ticketTypeId,
    quantity: checkout.quantity,
    checkoutId: checkout.id,
  });

  await db.paymentCheckout.update({
    where: { id: checkout.id },
    data: {
      status: PaymentCheckoutStatus.COMPLETED,
      stripePaymentIntentId: stripePaymentIntentId ?? undefined,
      completedAt: new Date(),
    },
  });

  return {
    ...checkout,
    purchase: result.purchase,
  };
}

export async function getPaymentCheckoutByStripeSessionId(stripeCheckoutSessionId: string) {
  return db.paymentCheckout.findUnique({
    where: { stripeCheckoutSessionId },
  });
}

export async function getPaymentCheckoutByStripePaymentIntentId(stripePaymentIntentId: string) {
  return db.paymentCheckout.findFirst({
    where: { stripePaymentIntentId },
  });
}

export async function updatePaymentCheckoutStatus({
  checkoutId,
  status,
  stripePaymentIntentId,
  stripeChargeId,
  stripePaymentStatus,
  failureReason,
  lastWebhookEvent,
  processingStartedAt,
  paymentConfirmedAt,
}: {
  checkoutId: string;
  status: PaymentCheckoutStatus;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  stripePaymentStatus?: string | null;
  failureReason?: string | null;
  lastWebhookEvent?: string | null;
  processingStartedAt?: Date | null;
  paymentConfirmedAt?: Date | null;
}) {
  return db.paymentCheckout.update({
    where: { id: checkoutId },
    data: {
      status,
      stripePaymentIntentId: stripePaymentIntentId ?? undefined,
      stripeChargeId: stripeChargeId ?? undefined,
      stripePaymentStatus: stripePaymentStatus ?? undefined,
      failureReason: failureReason ?? undefined,
      lastWebhookEvent: lastWebhookEvent ?? undefined,
      processingStartedAt:
        processingStartedAt === null ? null : processingStartedAt === undefined ? undefined : processingStartedAt,
      paymentConfirmedAt:
        paymentConfirmedAt === null ? null : paymentConfirmedAt === undefined ? undefined : paymentConfirmedAt,
      completedAt: status === PaymentCheckoutStatus.COMPLETED ? new Date() : undefined,
    },
  });
}

export async function listPendingPaymentCheckoutsForBuyer(buyerId: string) {
  return db.paymentCheckout.findMany({
    where: {
      buyerId,
      status: {
        in: [
          PaymentCheckoutStatus.PENDING,
          PaymentCheckoutStatus.PROCESSING,
          PaymentCheckoutStatus.FAILED,
          PaymentCheckoutStatus.EXPIRED,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      event: {
        select: {
          id: true,
          slug: true,
          title: true,
          city: true,
          imageUrl: true,
          date: true,
        },
      },
      ticketType: {
        select: {
          name: true,
        },
      },
    },
    take: 20,
  });
}

export async function listUserTickets(userId: string) {
  return db.eventTicket.findMany({
    where: {
      buyerId: userId,
      purchase: {
        status: "CONFIRMED",
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      event: {
        select: {
          id: true,
          slug: true,
          title: true,
          city: true,
          location: true,
          date: true,
          endDate: true,
          imageUrl: true,
          owner: {
            select: {
              username: true,
              name: true,
            },
          },
        },
      },
      ticketType: {
        select: {
          name: true,
          price: true,
        },
      },
      validatedBy: {
        select: {
          username: true,
          name: true,
        },
      },
    },
  });
}

export async function getTicketById(ticketId: string, buyerId: string) {
  return db.eventTicket.findFirst({
    where: {
      id: ticketId,
      buyerId,
    },
    include: {
      event: {
        include: {
          owner: {
            select: {
              username: true,
              name: true,
            },
          },
        },
      },
      ticketType: true,
      validatedBy: {
        select: {
          username: true,
          name: true,
        },
      },
    },
  });
}

export async function validateVenueTicket({
  scannerUserId,
  code,
}: {
  scannerUserId: string;
  code: string;
}) {
  return db.$transaction(async (tx) => {
    const scanner = await tx.user.findUnique({
      where: { id: scannerUserId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!scanner) {
      throw new Error("No existe este usuario.");
    }

    const ticket = await tx.eventTicket.findUnique({
      where: { qrCode: code },
      include: {
        event: {
          select: {
            id: true,
            ownerId: true,
            title: true,
            date: true,
          },
        },
        ticketType: {
          select: {
            name: true,
            description: true,
            includedDrinks: true,
          },
        },
        buyer: {
          select: {
            username: true,
            name: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new Error("No existe ninguna entrada con ese código.");
    }

    if (scanner.role !== USER_ROLE.ADMIN) {
      const assignment = await tx.venueDoorStaff.findFirst({
        where: {
          venueId: ticket.event.ownerId,
          staffUserId: scannerUserId,
          OR: [{ eventId: null }, { eventId: ticket.event.id }],
        },
        select: { id: true },
      });

      if (!assignment) {
        throw new Error("Solo los porteros autorizados o los admins pueden escanear esta entrada.");
      }
    }

    if (ticket.status === "USED") {
      throw new Error("Esta entrada ya fue validada.");
    }

    if (ticket.status === "CANCELLED") {
      throw new Error("Esta entrada está cancelada.");
    }

    const validated = await tx.eventTicket.update({
      where: { id: ticket.id },
      data: {
        status: "USED",
        validatedAt: new Date(),
        validatedById: scannerUserId,
      },
      include: {
        event: {
          select: {
            title: true,
          },
        },
        ticketType: {
          select: {
            name: true,
            description: true,
            includedDrinks: true,
          },
        },
        buyer: {
          select: {
            username: true,
            name: true,
          },
        },
      },
    });

    const remainingDrinks = Math.max(validated.ticketType.includedDrinks - validated.consumedDrinks, 0);

    await tx.eventTicketAccessLog.create({
      data: {
        ticketId: validated.id,
        eventId: ticket.event.id,
        action: TicketAccessAction.VALIDATED,
        actorId: scannerUserId,
        remainingDrinks,
        notes: "Entrada validada en puerta.",
      },
    });

    return validated;
  });
}

export async function inspectVenueTicketByCode({
  scannerUserId,
  code,
}: {
  scannerUserId: string;
  code: string;
}) {
  const scanner = await db.user.findUnique({
    where: { id: scannerUserId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!scanner) {
    throw new Error("No existe este usuario.");
  }

  const ticket = await db.eventTicket.findUnique({
    where: { qrCode: code },
    include: {
      event: {
        select: {
          id: true,
          ownerId: true,
          title: true,
        },
      },
      ticketType: {
        select: {
          name: true,
          description: true,
          includedDrinks: true,
        },
      },
      buyer: {
        select: {
          username: true,
          name: true,
        },
      },
    },
  });

  if (!ticket) {
    throw new Error("No existe ninguna entrada con ese codigo.");
  }

  if (scanner.role !== USER_ROLE.ADMIN) {
    const assignment = await db.venueDoorStaff.findFirst({
      where: {
        venueId: ticket.event.ownerId,
        staffUserId: scannerUserId,
        OR: [{ eventId: null }, { eventId: ticket.event.id }],
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new Error("Solo los porteros autorizados o los admins pueden ver esta entrada.");
    }
  }

  return {
    ...ticket,
    remainingDrinks: Math.max(ticket.ticketType.includedDrinks - ticket.consumedDrinks, 0),
  };
}

export async function redeemTicketDrink({
  scannerUserId,
  ticketId,
}: {
  scannerUserId: string;
  ticketId: string;
}) {
  return db.$transaction(async (tx) => {
    const scanner = await tx.user.findUnique({
      where: { id: scannerUserId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!scanner) {
      throw new Error("No existe este usuario.");
    }

    const ticket = await tx.eventTicket.findUnique({
      where: { id: ticketId },
      include: {
        event: {
          select: {
            id: true,
            ownerId: true,
            title: true,
          },
        },
        ticketType: {
          select: {
            id: true,
            name: true,
            description: true,
            includedDrinks: true,
          },
        },
        buyer: {
          select: {
            username: true,
            name: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new Error("No existe ninguna entrada con ese identificador.");
    }

    if (scanner.role !== USER_ROLE.ADMIN) {
      const assignment = await tx.venueDoorStaff.findFirst({
        where: {
          venueId: ticket.event.ownerId,
          staffUserId: scannerUserId,
          OR: [{ eventId: null }, { eventId: ticket.event.id }],
        },
        select: { id: true },
      });

      if (!assignment) {
        throw new Error("Solo los porteros autorizados o los admins pueden descontar consumiciones.");
      }
    }

    if (ticket.status !== "USED") {
      throw new Error("Primero hay que validar la entrada antes de descontar consumiciones.");
    }

    const remainingDrinks = Math.max(ticket.ticketType.includedDrinks - ticket.consumedDrinks, 0);
    if (remainingDrinks <= 0) {
      throw new Error("Esta entrada ya no tiene consumiciones disponibles.");
    }

    const updatedTicket = await tx.eventTicket.update({
      where: { id: ticket.id },
      data: {
        consumedDrinks: {
          increment: 1,
        },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
          },
        },
        ticketType: {
          select: {
            name: true,
            description: true,
            includedDrinks: true,
          },
        },
        buyer: {
          select: {
            username: true,
            name: true,
          },
        },
      },
    });

    const drinksLeft = Math.max(updatedTicket.ticketType.includedDrinks - updatedTicket.consumedDrinks, 0);

    await tx.eventTicketAccessLog.create({
      data: {
        ticketId: updatedTicket.id,
        eventId: updatedTicket.event.id,
        action: TicketAccessAction.DRINK_REDEEMED,
        actorId: scannerUserId,
        drinksDelta: -1,
        remainingDrinks: drinksLeft,
        notes: "Consumicion descontada en puerta.",
      },
    });

    return {
      ...updatedTicket,
      remainingDrinks: drinksLeft,
    };
  });
}
