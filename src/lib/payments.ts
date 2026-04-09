import Stripe from "stripe";

export const PLATFORM_REVENUE_SHARE_RATE = 0.0004;
export const PLATFORM_MANAGEMENT_FEE_RATE = 0.0003;
export const DEFAULT_PAYMENT_CURRENCY = "eur";

export function calculatePlatformRevenueAmount(baseAmount: number) {
  if (baseAmount <= 0) return 0;
  return Math.round(baseAmount * PLATFORM_REVENUE_SHARE_RATE);
}

export function calculateManagementFeeAmount(baseAmount: number) {
  if (baseAmount <= 0) return 0;
  return Math.round(baseAmount * PLATFORM_MANAGEMENT_FEE_RATE);
}

export function calculateCheckoutAmounts(unitAmount: number | null, quantity: number) {
  const safeUnitAmount = unitAmount ?? 0;
  const baseAmount = safeUnitAmount * quantity;
  const revenueShareAmount = calculatePlatformRevenueAmount(baseAmount);
  const managementFeeAmount = calculateManagementFeeAmount(baseAmount);
  const applicationFeeAmount = revenueShareAmount + managementFeeAmount;
  const totalAmount = baseAmount + managementFeeAmount;

  return {
    baseAmount,
    revenueShareAmount,
    managementFeeAmount,
    applicationFeeAmount,
    totalAmount,
  };
}

export function isStripePaymentsEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe no está configurado todavía.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

export function getAppBaseUrl() {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
