"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { getAppBaseUrl, getStripeClient, isStripePaymentsEnabled } from "@/lib/payments";
import { syncStripeConnectStatusByAccountId } from "@/lib/stripe-connect";

export async function startStripeConnectOnboardingAction() {
  const venue = await requireRole(["VENUE"]);

  if (!isStripePaymentsEnabled()) {
    throw new Error("Stripe aún no está configurado en la plataforma.");
  }

  const stripe = getStripeClient();
  const currentUser = await db.user.findUnique({
    where: { id: venue.id },
    select: {
      id: true,
      email: true,
      name: true,
      stripeConnectedAccountId: true,
    },
  });

  if (!currentUser) {
    throw new Error("Local no encontrado.");
  }

  let accountId = currentUser.stripeConnectedAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: currentUser.email,
      business_type: "company",
      metadata: {
        userId: currentUser.id,
      },
      business_profile: {
        name: currentUser.name ?? undefined,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    accountId = account.id;

    await db.user.update({
      where: { id: currentUser.id },
      data: {
        stripeConnectedAccountId: accountId,
      },
    });
  }

  const baseUrl = getAppBaseUrl();
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/local/dashboard?stripe=refresh`,
    return_url: `${baseUrl}/local/dashboard?stripe=connected`,
    type: "account_onboarding",
  });

  await syncStripeConnectStatusByAccountId(currentUser.id, accountId);

  redirect(accountLink.url);
}

export async function openStripeConnectDashboardAction() {
  const venue = await requireRole(["VENUE"]);

  if (!isStripePaymentsEnabled()) {
    throw new Error("Stripe aún no está configurado en la plataforma.");
  }

  const currentUser = await db.user.findUnique({
    where: { id: venue.id },
    select: {
      id: true,
      stripeConnectedAccountId: true,
    },
  });

  if (!currentUser?.stripeConnectedAccountId) {
    throw new Error("Todavía no has conectado tu cuenta de cobros.");
  }

  await syncStripeConnectStatusByAccountId(currentUser.id, currentUser.stripeConnectedAccountId);

  const stripe = getStripeClient();
  const loginLink = await stripe.accounts.createLoginLink(currentUser.stripeConnectedAccountId);

  redirect(loginLink.url);
}

export async function syncStripeConnectStatusAction() {
  const venue = await requireRole(["VENUE"]);

  if (!isStripePaymentsEnabled()) {
    throw new Error("Stripe aún no está configurado en la plataforma.");
  }

  const currentUser = await db.user.findUnique({
    where: { id: venue.id },
    select: {
      id: true,
      stripeConnectedAccountId: true,
    },
  });

  if (!currentUser?.stripeConnectedAccountId) {
    throw new Error("Todavía no has conectado tu cuenta de cobros.");
  }

  await syncStripeConnectStatusByAccountId(currentUser.id, currentUser.stripeConnectedAccountId);

  redirect("/local/dashboard?stripe=sync");
}
