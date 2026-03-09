// ── lib/stripe.ts ─────────────────────────────────────────────
// Stripe client singleton (server-side only).
// Import this in API routes and webhook handlers.
// Never import in client components.

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "Missing STRIPE_SECRET_KEY. Add it to your .env.local file."
  );
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // Pin to a specific API version for stability
  apiVersion: "2025-01-27.acacia",
  typescript: true,
  appInfo: {
    name:    "Ticket Mint",
    version: "1.0.0",
  },
});
