import type Stripe from "stripe";
import { VenuePayoutStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/payments";

function mapStripePayoutStatus(status: Stripe.Payout["status"]): VenuePayoutStatus {
  if (status === "paid") return VenuePayoutStatus.PAID;
  if (status === "in_transit") return VenuePayoutStatus.IN_TRANSIT;
  if (status === "failed") return VenuePayoutStatus.FAILED;
  if (status === "canceled") return VenuePayoutStatus.CANCELED;
  return VenuePayoutStatus.PENDING;
}

export async function syncStripeConnectStatusByAccountId(userId: string, accountId: string) {
  const stripe = getStripeClient();
  const account = await stripe.accounts.retrieve(accountId);

  return db.user.update({
    where: { id: userId },
    data: {
      stripeDetailsSubmitted: account.details_submitted ?? false,
      stripeChargesEnabled: account.charges_enabled ?? false,
      stripePayoutsEnabled: account.payouts_enabled ?? false,
      stripeOnboardingComplete: Boolean(account.details_submitted && account.charges_enabled),
      stripeConnectLastSyncedAt: new Date(),
    },
  });
}

export async function syncStripeConnectStatusByStripeAccountId(accountId: string) {
  const user = await db.user.findFirst({
    where: { stripeConnectedAccountId: accountId },
    select: {
      id: true,
      stripeConnectedAccountId: true,
    },
  });

  if (!user?.stripeConnectedAccountId) {
    return null;
  }

  return syncStripeConnectStatusByAccountId(user.id, user.stripeConnectedAccountId);
}

export async function upsertVenueStripePayout(args: {
  stripeAccountId: string;
  payout: Stripe.Payout;
  lastWebhookEvent: string;
}) {
  const venue = await db.user.findFirst({
    where: { stripeConnectedAccountId: args.stripeAccountId },
    select: {
      id: true,
    },
  });

  if (!venue) {
    return null;
  }

  const amount = typeof args.payout.amount === "number" ? args.payout.amount : 0;
  const arrivalDate = args.payout.arrival_date ? new Date(args.payout.arrival_date * 1000) : null;
  const paidAt = args.payout.status === "paid" && args.payout.arrival_date ? new Date(args.payout.arrival_date * 1000) : null;

  return db.venueStripePayout.upsert({
    where: { stripePayoutId: args.payout.id },
    create: {
      venueId: venue.id,
      stripePayoutId: args.payout.id,
      stripeBalanceTransactionId:
        typeof args.payout.balance_transaction === "string" ? args.payout.balance_transaction : null,
      currency: args.payout.currency,
      amount,
      arrivalDate,
      status: mapStripePayoutStatus(args.payout.status),
      failureCode: args.payout.failure_code ?? null,
      failureMessage: args.payout.failure_message ?? null,
      lastWebhookEvent: args.lastWebhookEvent,
      paidAt,
    },
    update: {
      stripeBalanceTransactionId:
        typeof args.payout.balance_transaction === "string" ? args.payout.balance_transaction : null,
      currency: args.payout.currency,
      amount,
      arrivalDate,
      status: mapStripePayoutStatus(args.payout.status),
      failureCode: args.payout.failure_code ?? null,
      failureMessage: args.payout.failure_message ?? null,
      lastWebhookEvent: args.lastWebhookEvent,
      paidAt,
    },
  });
}
