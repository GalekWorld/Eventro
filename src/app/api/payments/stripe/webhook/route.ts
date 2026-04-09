import Stripe from "stripe";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  completePaymentCheckout,
  getPaymentCheckoutByStripePaymentIntentId,
  getPaymentCheckoutByStripeSessionId,
  updatePaymentCheckoutStatus,
} from "@/features/events/event.service";
import { getStripeClient } from "@/lib/payments";
import { syncStripeConnectStatusByStripeAccountId, upsertVenueStripePayout } from "@/lib/stripe-connect";

function isConfirmedSession(session: Stripe.Checkout.Session) {
  return session.payment_status === "paid" || session.payment_status === "no_payment_required";
}

function getChargeIdFromPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  return typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : null;
}

function revalidatePaymentPaths(eventId?: string | null) {
  revalidatePath("/tickets");
  revalidatePath("/local/dashboard");
  revalidatePath("/local/payouts");

  if (eventId) {
    revalidatePath(`/local/events/${eventId}/tickets`);
  }
}

async function completeCheckout(checkoutId: string, eventId: string, args: {
  paymentIntentId?: string | null;
  chargeId?: string | null;
  paymentStatus?: string | null;
  lastWebhookEvent: string;
}) {
  await completePaymentCheckout(checkoutId, args.paymentIntentId);
  await updatePaymentCheckoutStatus({
    checkoutId,
    status: "COMPLETED",
    stripePaymentIntentId: args.paymentIntentId,
    stripeChargeId: args.chargeId,
    stripePaymentStatus: args.paymentStatus,
    failureReason: null,
    lastWebhookEvent: args.lastWebhookEvent,
    paymentConfirmedAt: new Date(),
  }).catch(() => null);
  revalidatePaymentPaths(eventId);
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe no configurado." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Firma ausente." }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Firma invalida." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
    const checkout = await getPaymentCheckoutByStripeSessionId(session.id);

    if (checkout) {
      if (isConfirmedSession(session)) {
        await completeCheckout(checkout.id, checkout.eventId, {
          paymentIntentId,
          paymentStatus: session.payment_status ?? null,
          lastWebhookEvent: event.type,
        });
      } else {
        await updatePaymentCheckoutStatus({
          checkoutId: checkout.id,
          status: "PROCESSING",
          stripePaymentIntentId: paymentIntentId,
          stripePaymentStatus: session.payment_status ?? null,
          lastWebhookEvent: event.type,
          processingStartedAt: new Date(),
        }).catch(() => null);
        revalidatePaymentPaths(checkout.eventId);
      }
    }
  }

  if (event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const checkout = await getPaymentCheckoutByStripeSessionId(session.id);
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;

    if (checkout) {
      await completeCheckout(checkout.id, checkout.eventId, {
        paymentIntentId,
        paymentStatus: session.payment_status ?? "paid",
        lastWebhookEvent: event.type,
      });
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const checkout = await getPaymentCheckoutByStripeSessionId(session.id);

    if (checkout && checkout.status !== "COMPLETED") {
      await updatePaymentCheckoutStatus({
        checkoutId: checkout.id,
        status: "EXPIRED",
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
        stripePaymentStatus: session.payment_status ?? null,
          failureReason: "La sesión de pago expiró antes de completarse.",
        lastWebhookEvent: event.type,
      }).catch(() => null);
      revalidatePaymentPaths(checkout.eventId);
    }
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const checkout = await getPaymentCheckoutByStripeSessionId(session.id);

    if (checkout && checkout.status !== "COMPLETED") {
      await updatePaymentCheckoutStatus({
        checkoutId: checkout.id,
        status: "FAILED",
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
        stripePaymentStatus: session.payment_status ?? "unpaid",
        failureReason: "El pago no pudo completarse.",
        lastWebhookEvent: event.type,
      }).catch(() => null);
      revalidatePaymentPaths(checkout.eventId);
    }
  }

  if (event.type === "payment_intent.processing") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const checkout = await getPaymentCheckoutByStripePaymentIntentId(paymentIntent.id);

    if (checkout && checkout.status !== "COMPLETED") {
      await updatePaymentCheckoutStatus({
        checkoutId: checkout.id,
        status: "PROCESSING",
        stripePaymentIntentId: paymentIntent.id,
        stripeChargeId: getChargeIdFromPaymentIntent(paymentIntent),
        stripePaymentStatus: paymentIntent.status,
        lastWebhookEvent: event.type,
        processingStartedAt: new Date(),
      }).catch(() => null);
      revalidatePaymentPaths(checkout.eventId);
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const checkout = await getPaymentCheckoutByStripePaymentIntentId(paymentIntent.id);

    if (checkout) {
      await completeCheckout(checkout.id, checkout.eventId, {
        paymentIntentId: paymentIntent.id,
        chargeId: getChargeIdFromPaymentIntent(paymentIntent),
        paymentStatus: paymentIntent.status,
        lastWebhookEvent: event.type,
      });
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const checkout = await getPaymentCheckoutByStripePaymentIntentId(paymentIntent.id);

    if (checkout && checkout.status !== "COMPLETED") {
      await updatePaymentCheckoutStatus({
        checkoutId: checkout.id,
        status: "FAILED",
        stripePaymentIntentId: paymentIntent.id,
        stripeChargeId: getChargeIdFromPaymentIntent(paymentIntent),
        stripePaymentStatus: paymentIntent.status,
        failureReason: paymentIntent.last_payment_error?.message ?? "El pago fue rechazado.",
        lastWebhookEvent: event.type,
      }).catch(() => null);
      revalidatePaymentPaths(checkout.eventId);
    }
  }

  if (event.type === "charge.succeeded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
    if (paymentIntentId) {
      const checkout = await getPaymentCheckoutByStripePaymentIntentId(paymentIntentId);

      if (checkout) {
        await updatePaymentCheckoutStatus({
          checkoutId: checkout.id,
          status: checkout.status,
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: charge.id,
          stripePaymentStatus: charge.status,
          lastWebhookEvent: event.type,
        }).catch(() => null);
      }
    }
  }

  if (event.type === "charge.failed") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;

    if (paymentIntentId) {
      const checkout = await getPaymentCheckoutByStripePaymentIntentId(paymentIntentId);

      if (checkout && checkout.status !== "COMPLETED") {
        await updatePaymentCheckoutStatus({
          checkoutId: checkout.id,
          status: "FAILED",
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: charge.id,
          stripePaymentStatus: charge.status,
          failureReason: charge.failure_message ?? "El cargo fue rechazado.",
          lastWebhookEvent: event.type,
        }).catch(() => null);
        revalidatePaymentPaths(checkout.eventId);
      }
    }
  }

  if (event.type === "account.updated" && event.account) {
    await syncStripeConnectStatusByStripeAccountId(event.account).catch(() => null);
    revalidatePath("/local/dashboard");
    revalidatePath("/local/payouts");
  }

  if (
    (event.type === "payout.created" ||
      event.type === "payout.updated" ||
      event.type === "payout.paid" ||
      event.type === "payout.failed" ||
      event.type === "payout.canceled") &&
    event.account
  ) {
    const payout = event.data.object as Stripe.Payout;
    await upsertVenueStripePayout({
      stripeAccountId: event.account,
      payout,
      lastWebhookEvent: event.type,
    }).catch(() => null);
    revalidatePath("/local/dashboard");
    revalidatePath("/local/payouts");
  }

  return NextResponse.json({ received: true });
}
