"use server";

import { NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import type { ActionState } from "@/lib/http";
import {
  completePaymentCheckout,
  createPaymentCheckout,
  inspectVenueTicketByCode,
  purchaseTicketsForEvent,
  prepareTicketCheckout,
  redeemTicketDrink,
  validateVenueTicket,
} from "@/features/events/event.service";
import { createAdminAuditLog } from "@/lib/admin-audit";
import { db } from "@/lib/db";
import { getEventPath } from "@/lib/event-path";
import { DEFAULT_PAYMENT_CURRENCY, getAppBaseUrl, getStripeClient, isStripePaymentsEnabled } from "@/lib/payments";
import { requireAuth } from "@/lib/permissions";
import { assertRateLimit } from "@/lib/rate-limit";
import { readFormValue } from "@/lib/form-data";

function getTicketScanCode(message: string) {
  if (message.includes("ya fue validada")) return "ALREADY_USED";
  if (message.includes("no existe ningúna entrada") || message.includes("código")) return "INVALID";
  if (message.includes("cancelada")) return "CANCELLED";
  if (message.includes("autorizados")) return "FORBIDDEN";
  return "ERROR";
}

function revalidatePurchaseViews(eventId: string, eventPath: string) {
  revalidatePath(eventPath);
  revalidatePath("/tickets");
  revalidatePath(`/local/events/${eventId}/tickets`);
}

function revalidateScannerViews(eventId: string) {
  revalidatePath("/tickets");
  revalidatePath("/scanner");
  revalidatePath(`/local/events/${eventId}/tickets`);
  revalidatePath(`/scanner/${eventId}`);
}

export async function purchaseEventTicketsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireAuth();
    await assertRateLimit({
      key: `ticket:purchase:${user.id}`,
      limit: 20,
      windowMs: 10 * 60 * 1000,
      message: "Estas intentando comprar demasiado rápido. Espera un momento.",
      userId: user.id,
    });

    const eventId = readFormValue(formData.get("eventId"));
    const ticketTypeId = readFormValue(formData.get("ticketTypeId"));
    const quantity = Number(readFormValue(formData.get("quantity")) || "1");

    if (!eventId || !ticketTypeId || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return { error: "Selecciona una entrada y una cantidad valida." };
    }

    const checkout = await prepareTicketCheckout({
      buyerId: user.id,
      eventId,
      ticketTypeId,
      quantity,
    });

    if (checkout.ownerComplimentary) {
      await purchaseTicketsForEvent({
        buyerId: user.id,
        eventId,
        ticketTypeId,
        quantity,
        allowOwnerComplimentary: true,
      });

      revalidatePurchaseViews(eventId, getEventPath(checkout.event));

      return {
        success: "Entradas reservadas gratis para tu local. Ya las tienes en tu cartera.",
      };
    }

    if (isStripePaymentsEnabled()) {
      const paymentCheckout = await createPaymentCheckout({
        provider: "STRIPE",
        buyerId: user.id,
        eventId,
        ticketTypeId,
        quantity,
        currency: DEFAULT_PAYMENT_CURRENCY,
        baseAmount: checkout.baseAmount,
        revenueShareAmount: checkout.revenueShareAmount,
        managementFeeAmount: checkout.managementFeeAmount,
        applicationFeeAmount: checkout.applicationFeeAmount,
        totalAmount: checkout.totalAmount,
      });

      const stripe = getStripeClient();
      const baseUrl = getAppBaseUrl();
      const lineItems = [
        {
          quantity,
          price_data: {
            currency: DEFAULT_PAYMENT_CURRENCY,
            unit_amount: checkout.ticketType.price == null ? 0 : Math.round(Number(checkout.ticketType.price) * 100),
            product_data: {
              name: `${checkout.event.title} · ${checkout.ticketType.name}`,
              description: checkout.ticketType.description ?? undefined,
            },
          },
        },
      ];

      if (checkout.managementFeeAmount > 0) {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: DEFAULT_PAYMENT_CURRENCY,
            unit_amount: checkout.managementFeeAmount,
            product_data: {
              name: "Gastos de gestión",
              description: "Comisión de plataforma añadida al checkout.",
            },
          },
        });
      }

      const paymentIntentData =
        checkout.event.owner.stripeConnectedAccountId && checkout.applicationFeeAmount > 0
          ? {
              application_fee_amount: checkout.applicationFeeAmount,
              transfer_data: {
                destination: checkout.event.owner.stripeConnectedAccountId,
              },
              on_behalf_of: checkout.event.owner.stripeConnectedAccountId,
            }
          : undefined;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${baseUrl}/tickets?checkout=processing`,
        cancel_url: `${baseUrl}${getEventPath(checkout.event)}?checkout=cancelled`,
        line_items: lineItems,
        payment_intent_data: paymentIntentData,
        metadata: {
          checkoutId: paymentCheckout.id,
          buyerId: user.id,
          eventId,
          ticketTypeId,
          quantity: String(quantity),
        },
      });

      await db.paymentCheckout.update({
        where: { id: paymentCheckout.id },
        data: {
          stripeCheckoutSessionId: session.id,
          expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null,
        },
      });

      if (!session.url) {
        return { error: "No se pudo abrir el checkout de pago." };
      }

      redirect(session.url);
    }

    const paymentCheckout = await createPaymentCheckout({
      provider: "INTERNAL",
      buyerId: user.id,
      eventId,
      ticketTypeId,
      quantity,
      currency: DEFAULT_PAYMENT_CURRENCY,
      baseAmount: checkout.baseAmount,
      revenueShareAmount: checkout.revenueShareAmount,
      managementFeeAmount: checkout.managementFeeAmount,
      applicationFeeAmount: checkout.applicationFeeAmount,
      totalAmount: checkout.totalAmount,
    });

    await completePaymentCheckout(paymentCheckout.id);

    await db.notification
      .create({
        data: {
          recipientId: checkout.event.ownerId,
          actorId: user.id,
          type: NotificationType.DIRECT_MESSAGE,
          title: "Nueva compra de entradas",
          body: `@${user.username ?? "usuario"} ha comprado ${quantity} entrada(s) para ${checkout.event.title}.`,
          link: `/local/events/${eventId}/tickets`,
        },
      })
      .catch(() => null);

    revalidatePurchaseViews(eventId, getEventPath(checkout.event));

    return {
      success:
        checkout.managementFeeAmount > 0 || checkout.revenueShareAmount > 0
          ? "Compra completada. Tus entradas ya están en tu cartera."
          : "Entradas reservadas. Ya las tienes en tu cartera.",
    };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      error: error instanceof Error ? error.message : "No se pudo completar la compra.",
    };
  }
}

export async function validateTicketAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const eventId = readFormValue(formData.get("eventId"));
  const code = readFormValue(formData.get("code")).toUpperCase();
  let scannerId = "";

  try {
    const scanner = await requireAuth();
    scannerId = scanner.id;
    await assertRateLimit({
      key: `ticket:validate:${scanner.id}`,
      limit: 60,
      windowMs: 10 * 60 * 1000,
      message: "Has intentado validar demasiadas entradas en poco tiempo.",
      userId: scanner.id,
    });

    if (!eventId || !code) {
      return { code: "INVALID", error: "Introduce un código válido." };
    }

    const ticket = await validateVenueTicket({
      scannerUserId: scanner.id,
      code,
    });

    await createAdminAuditLog({
      adminId: scanner.id,
      action: "validate_ticket",
      targetType: "event_ticket",
      targetId: ticket.id,
      details: `${ticket.event.title} · ${ticket.ticketType.name}`,
    }).catch(() => null);

    revalidateScannerViews(eventId);

    return {
      success: `Entrada validada para ${ticket.buyer.username ?? ticket.buyer.name ?? "usuario"} · ${ticket.ticketType.name}`,
      data: {
        ticketId: ticket.id,
        buyerName: ticket.buyer.username ?? ticket.buyer.name ?? "usuario",
        ticketName: ticket.ticketType.name,
        ticketDescription: ticket.ticketType.description ?? "Sin descripción adicional",
        includedDrinks: ticket.ticketType.includedDrinks,
        consumedDrinks: ticket.consumedDrinks,
        remainingDrinks: Math.max(ticket.ticketType.includedDrinks - ticket.consumedDrinks, 0),
        eventTitle: ticket.event.title,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo validar la entrada.";

    if (getTicketScanCode(message) === "ALREADY_USED" && scannerId && code) {
      try {
        const ticket = await inspectVenueTicketByCode({
          scannerUserId: scannerId,
          code,
        });

        return {
          code: "ALREADY_USED",
          error: message,
          data: {
            ticketId: ticket.id,
            buyerName: ticket.buyer.username ?? ticket.buyer.name ?? "usuario",
            ticketName: ticket.ticketType.name,
            ticketDescription: ticket.ticketType.description ?? "Sin descripción adicional",
            includedDrinks: ticket.ticketType.includedDrinks,
            consumedDrinks: ticket.consumedDrinks,
            remainingDrinks: ticket.remainingDrinks,
            eventTitle: ticket.event.title,
          },
        };
      } catch {
        // ignore fallback lookup error and return original error
      }
    }

    return {
      code: getTicketScanCode(message),
      error: message,
    };
  }
}

export async function redeemTicketDrinkAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const scanner = await requireAuth();
    await assertRateLimit({
      key: `ticket:drink:${scanner.id}`,
      limit: 80,
      windowMs: 10 * 60 * 1000,
      message: "Has intentado registrar demasiadas consumiciones en poco tiempo.",
      userId: scanner.id,
    });

    const eventId = readFormValue(formData.get("eventId"));
    const ticketId = readFormValue(formData.get("ticketId"));

    if (!eventId || !ticketId) {
      return { code: "INVALID", error: "Falta informacion de la entrada." };
    }

    const ticket = await redeemTicketDrink({
      scannerUserId: scanner.id,
      ticketId,
    });

    await createAdminAuditLog({
      adminId: scanner.id,
      action: "redeem_ticket_drink",
      targetType: "event_ticket",
      targetId: ticket.id,
      details: `${ticket.event.title} · ${ticket.ticketType.name}`,
    }).catch(() => null);

    revalidateScannerViews(eventId);

    return {
      success: `Consumición registrada para ${ticket.buyer.username ?? ticket.buyer.name ?? "usuario"}.`,
      data: {
        ticketId: ticket.id,
        buyerName: ticket.buyer.username ?? ticket.buyer.name ?? "usuario",
        ticketName: ticket.ticketType.name,
        ticketDescription: ticket.ticketType.description ?? "Sin descripción adicional",
        includedDrinks: ticket.ticketType.includedDrinks,
        consumedDrinks: ticket.consumedDrinks,
        remainingDrinks: ticket.remainingDrinks,
        eventTitle: ticket.event.title,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar la consumición.";
    return {
      code: message.includes("ya no tiene consumiciones")
        ? "NO_DRINKS_LEFT"
        : message.includes("Primero hay que validar")
          ? "NOT_VALIDATED"
          : message.includes("autorizados")
            ? "FORBIDDEN"
            : "ERROR",
      error: message,
    };
  }
}

