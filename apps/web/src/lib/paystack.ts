import { Paystack } from 'paystack-sdk';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY && process.env.NODE_ENV === "production") {
  console.warn("⚠️ PAYSTACK_SECRET_KEY is not set. Billing features will not work.");
}

export const paystack = PAYSTACK_SECRET_KEY 
  ? new Paystack(PAYSTACK_SECRET_KEY) 
  : null;

// Paystack Plan Codes (these would typically be stored in env or DB)
export const SUBSCRIPTION_PLANS = {
  PRO: {
    plan_code: process.env.PAYSTACK_PLAN_PRO || "PLN_placeholder_pro",
    name: "Pro",
    amount: 500000, // 5000 NGN in kobo
    interval: "monthly",
  },
  BUSINESS: {
    plan_code: process.env.PAYSTACK_PLAN_BUSINESS || "PLN_placeholder_bus",
    name: "Business Team",
    amount: 1500000, // 15000 NGN in kobo
    interval: "monthly",
  }
} as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;

/**
 * Initialize a checkout session (transaction)
 */
export async function initializeTransaction(
  email: string,
  amount: number, // in kobo
  callbackUrl: string,
  metadata?: Record<string, unknown>
) {
  if (!paystack) throw new Error("Paystack not configured");

  const response = await paystack.transaction.initialize({
    email,
    amount: amount.toString(),
    callback_url: callbackUrl,
    metadata: metadata,
  });

  if (!response.status) {
    throw new Error(`Paystack error: ${response.message}`);
  }

  return response.data;
}

/**
 * Verify a transaction using its reference
 */
export async function verifyTransaction(reference: string) {
  if (!paystack) throw new Error("Paystack not configured");

  const response = await paystack.transaction.verify(reference);

  if (!response.status) {
    throw new Error(`Paystack error: ${response.message}`);
  }

  return response.data;
}

/**
 * Create a new subscription for a customer
 */
export async function createSubscription(customerCode: string, planCode: string) {
  if (!paystack) throw new Error("Paystack not configured");

  const response = await paystack.subscription.create({
    customer: customerCode,
    plan: planCode,
  });

  if (!response.status) {
    throw new Error(`Paystack error: ${response.message}`);
  }

  return (response as any).data;
}
