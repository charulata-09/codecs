import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  // During build time, this env variable might not be present, so we don't crash
  // but we warn and handle it gracefully at runtime.
  console.warn("WARNING: STRIPE_SECRET_KEY is not defined in the environment.");
}

export const stripe = new Stripe(stripeSecretKey || "sk_test_placeholder_key_for_compilation", {
  apiVersion: "2026-06-24.dahlia",
  typescript: true,
});

/**
 * Returns absolute URL for redirect paths.
 */
export function getAbsoluteUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}${path}`;
}
