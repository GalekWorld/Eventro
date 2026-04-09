import { PaymentCheckoutStatus } from "@prisma/client";
import { db } from "@/lib/db";

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function toEuros(cents: number) {
  return cents / 100;
}

export async function getVenuePaymentReport(venueId: string) {
  const [checkouts, payouts] = await Promise.all([
    db.paymentCheckout.findMany({
      where: {
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
            slug: true,
            title: true,
            city: true,
            date: true,
          },
        },
        ticketType: {
          select: {
            id: true,
            name: true,
          },
        },
        purchase: {
          select: {
            id: true,
          },
        },
      },
      take: 200,
    }),
    db.venueStripePayout.findMany({
      where: { venueId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const completed = checkouts.filter((checkout) => checkout.status === PaymentCheckoutStatus.COMPLETED);
  const pending = checkouts.filter((checkout) => checkout.status === PaymentCheckoutStatus.PENDING);
  const processing = checkouts.filter((checkout) => checkout.status === PaymentCheckoutStatus.PROCESSING);
  const failed = checkouts.filter((checkout) => checkout.status === PaymentCheckoutStatus.FAILED);
  const expired = checkouts.filter((checkout) => checkout.status === PaymentCheckoutStatus.EXPIRED);

  const grossSalesCents = sum(completed.map((checkout) => checkout.baseAmount));
  const revenueShareCents = sum(completed.map((checkout) => checkout.revenueShareAmount));
  const managementFeesCents = sum(completed.map((checkout) => checkout.managementFeeAmount));
  const applicationFeesCents = sum(completed.map((checkout) => checkout.applicationFeeAmount));
  const buyerTotalCents = sum(completed.map((checkout) => checkout.totalAmount));
  const venueNetCents = grossSalesCents - revenueShareCents;
  const paidOutCents = sum(payouts.filter((payout) => payout.status === "PAID").map((payout) => payout.amount));
  const inTransitCents = sum(payouts.filter((payout) => payout.status === "IN_TRANSIT").map((payout) => payout.amount));

  return {
    checkouts,
    payouts,
    summary: {
      completedCount: completed.length,
      pendingCount: pending.length,
      processingCount: processing.length,
      failedCount: failed.length,
      expiredCount: expired.length,
      grossSales: toEuros(grossSalesCents),
      revenueShare: toEuros(revenueShareCents),
      managementFees: toEuros(managementFeesCents),
      applicationFees: toEuros(applicationFeesCents),
      venueNet: toEuros(venueNetCents),
      buyerTotal: toEuros(buyerTotalCents),
      paidOut: toEuros(paidOutCents),
      inTransit: toEuros(inTransitCents),
    },
  };
}

export async function getPlatformPaymentReport() {
  const completedCheckouts = await db.paymentCheckout.findMany({
    where: {
      status: PaymentCheckoutStatus.COMPLETED,
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
          slug: true,
          title: true,
          city: true,
          owner: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
      },
      ticketType: {
        select: {
          name: true,
        },
      },
    },
    take: 100,
  });

  const grossSalesCents = sum(completedCheckouts.map((checkout) => checkout.baseAmount));
  const revenueShareCents = sum(completedCheckouts.map((checkout) => checkout.revenueShareAmount));
  const managementFeesCents = sum(completedCheckouts.map((checkout) => checkout.managementFeeAmount));
  const applicationFeesCents = sum(completedCheckouts.map((checkout) => checkout.applicationFeeAmount));
  const venueNetCents = grossSalesCents - revenueShareCents;

  return {
    completedCheckouts,
    summary: {
      grossSales: toEuros(grossSalesCents),
      revenueShare: toEuros(revenueShareCents),
      managementFees: toEuros(managementFeesCents),
      applicationFees: toEuros(applicationFeesCents),
      venueNet: toEuros(venueNetCents),
    },
  };
}
