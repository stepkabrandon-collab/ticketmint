// ── Stripe Webhook Handler ────────────────────────────────────
// POST /api/stripe/webhook
//
// Flow:
//   1. Stripe calls this endpoint when checkout.session.completed fires
//   2. We verify the signature (STRIPE_WEBHOOK_SECRET)
//   3. Look up the pending stripe_session in Supabase
//   4. Build + send the Anchor buy_ticket instruction on-chain
//      using the platform keypair (server-side signer)
//   5. Mark the session complete, update ticket status in Supabase
//
// Security note:
//   - Only the platform server keypair signs on-chain txs here
//   - Buyer wallet is stored in session metadata, passed to Anchor
//   - Webhook is idempotent: duplicate events are no-ops

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseService } from "@/lib/supabase";
import { executeBuyTicket } from "@/lib/solana-server";

// Disable body parsing — Stripe requires raw body for signature verification
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  // ── 1. Verify Stripe signature ────────────────────────────
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("[Webhook] Signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── 2. Handle checkout.session.completed ──────────────────
  if (event.type !== "checkout.session.completed") {
    // Acknowledge but ignore other events
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const stripeSessionId = session.id;
  const metadata = session.metadata ?? {};
  const { ticketId, buyerWallet, mintAddress, sellerWallet } = metadata;

  if (!ticketId || !buyerWallet || !mintAddress || !sellerWallet) {
    console.error("[Webhook] Missing required metadata fields:", metadata);
    return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
  }

  // ── 3. Idempotency check ──────────────────────────────────
  const { data: existing } = await supabaseService
    .from("stripe_sessions")
    .select("status, on_chain_tx")
    .eq("stripe_session_id", stripeSessionId)
    .maybeSingle();

  if (existing?.status === "complete") {
    console.log("[Webhook] Duplicate event — already processed:", stripeSessionId);
    return NextResponse.json({ received: true });
  }

  // ── 4. Update session to processing ──────────────────────
  await supabaseService
    .from("stripe_sessions")
    .upsert(
      {
        stripe_session_id: stripeSessionId,
        ticket_id:         ticketId,
        buyer_wallet:      buyerWallet,
        amount_usd_cents:  session.amount_total ?? 0,
        status:            "pending",
      },
      { onConflict: "stripe_session_id" }
    );

  // ── 5. Execute on-chain buy_ticket via Anchor ─────────────
  // The platform server keypair (PLATFORM_KEYPAIR_SECRET) signs as
  // the fee wallet.  The actual SOL payment already happened via
  // Stripe; on-chain we transfer the NFT from escrow to buyer.
  //
  // NOTE: In a real system you'd hold SOL in escrow separately.
  // For this MVP: the platform pays the SOL on-chain from its wallet,
  // having already collected the equivalent in fiat.
  let txSig: string;
  try {
    txSig = await executeBuyTicket({
      mintAddress,
      buyerWallet,
      sellerWallet,
      ticketId,
    });
  } catch (err: any) {
    console.error("[Webhook] on-chain buy_ticket failed:", err.message);

    await supabaseService
      .from("stripe_sessions")
      .update({ status: "failed" })
      .eq("stripe_session_id", stripeSessionId);

    // Return 200 to prevent Stripe retries on a non-transient error
    return NextResponse.json({ received: true, error: "On-chain transfer failed" });
  }

  // ── 6. Mark complete in Supabase ──────────────────────────
  const now = new Date().toISOString();

  await Promise.all([
    // Session → complete
    supabaseService
      .from("stripe_sessions")
      .update({ status: "complete", on_chain_tx: txSig, completed_at: now })
      .eq("stripe_session_id", stripeSessionId),

    // Ticket → sold
    supabaseService
      .from("tickets")
      .update({
        listing_status:        "sold",
        owner_wallet:          buyerWallet,
        stripe_session_id:     stripeSessionId,
        stripe_payment_intent: session.payment_intent as string,
        sold_at:               now,
      })
      .eq("id", ticketId),

    // Transfer history entry
    supabaseService.from("transfer_history").insert({
      ticket_id:     ticketId,
      mint_address:  mintAddress,
      from_wallet:   sellerWallet,
      to_wallet:     buyerWallet,
      transfer_type: "buy",
      tx_signature:  txSig,
      transferred_at: now,
    }),
  ]);

  console.log(`[Webhook] Ticket ${ticketId} sold. Tx: ${txSig}`);
  return NextResponse.json({ received: true, txSig });
}
