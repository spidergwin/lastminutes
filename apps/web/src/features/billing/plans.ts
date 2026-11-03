export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: "Pro Trial",
    monthlyLimit: 120, // 2 hours
    trialDays: 7,
    price: 0,
    currency: "₦",
    features: [
      "2 hours of transcription",
      "Real-time streaming",
      "File uploads (up to 2GB)",
      "Global languages",
      "AI summaries & translation",
      "Google Calendar & Drive sync",
    ],
  },
  PRO: {
    name: "Pro",
    monthlyLimit: 900, // 15 hours
    trialDays: 0,
    price: 15000,
    currency: "₦",
    features: [
      "Up to 15 hours of transcription / mo",
      "Real-time streaming + file uploads (up to 2GB)",
      "Global Languages + Code-switching",
      "AI summaries & action items",
      "DOCX, PDF, SRT, VTT export",
      "Speaker diarization",
      "Google Calendar & Drive Integration",
      "Unlimited translations",
    ],
  },
  BUSINESS: {
    name: "Business",
    monthlyLimit: 3000, // 50 hours
    trialDays: 0,
    price: 45000,
    currency: "₦",
    features: [
      "Up to 50 hours of transcription / mo",
      "Everything that pro offers",
    ],
  },
} as const;

export function getPlanKey(plan: string): keyof typeof SUBSCRIPTION_PLANS {
  const normalized = plan.toUpperCase();
  // Map legacy plan names
  if (normalized === "PROFESSIONAL" || normalized === "STARTER") return "PRO";
  if (normalized === "ENTERPRISE") return "BUSINESS";
  return (normalized || "FREE") as keyof typeof SUBSCRIPTION_PLANS;
}

export function getPlan(planKey: keyof typeof SUBSCRIPTION_PLANS) {
  return SUBSCRIPTION_PLANS[planKey];
}

export function canUseFeature(plan: keyof typeof SUBSCRIPTION_PLANS, feature: string): boolean {
  const planData = SUBSCRIPTION_PLANS[plan];
  return (planData.features as readonly string[]).includes(feature);
}

export function formatPrice(price: number, currency: string = "₦"): string {
  return `${currency}${price.toLocaleString()}`;
}
