// ── Stripe Webhook Handler ────────────────────────────────────
// POST /api/stripe/webhook
//
// Flow:
//   1. Stripe calls this endpoint when checkout.session.completed fires
//   2. We verify the signature (STRIPE_WEBHOOK_SECRET)
//   3. Look up the pending stripe_session in Supabase (idempotency)
//   4. Mark ticket as sold + send confirmation email
//   5. Attempt on-chain NFT transfer if mintAddress is present (best-effort)
//   6. Mark session complete
//
// Security note:
//   - Only the platform server keypair signs on-chain txs here
//   - Buyer wallet is stored in session metadata, passed to Anchor
//   - Webhook is idempotent: duplicate events are no-ops
//   - mintAddress is optional — NFT minting may not be configured yet

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import QRCode from "qrcode";
import { stripe } from "@/lib/stripe";
import { supabaseService } from "@/lib/supabase";
import { executeBuyTicket } from "@/lib/solana-server";
import { sendPurchaseConfirmation } from "@/lib/emails/purchaseConfirmation";

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
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const stripeSessionId = session.id;
  const metadata = session.metadata ?? {};
  const { ticketId, buyerWallet, mintAddress, sellerWallet } = metadata;

  // ticketId and buyerWallet are the only truly required fields.
  // mintAddress may be empty for demo tickets without on-chain NFT minting.
  if (!ticketId || !buyerWallet) {
    console.error("[Webhook] Missing required metadata fields:", metadata);
    return NextResponse.json({ error: "Missing ticketId or buyerWallet" }, { status: 400 });
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

  // ── 5. Mark ticket as sold in Supabase ────────────────────
  const now = new Date().toISOString();

  await supabaseService
    .from("tickets")
    .update({
      listing_status:        "sold",
      owner_wallet:          buyerWallet,
      stripe_session_id:     stripeSessionId,
      stripe_payment_intent: session.payment_intent as string,
      sold_at:               now,
      ...(session.customer_details?.email
        ? { buyer_email: session.customer_details.email }
        : {}),
    })
    .eq("id", ticketId);

  console.log(`[Webhook] Ticket ${ticketId} marked as sold.`);

  // ── 5b. Generate and store QR code ────────────────────────
  const orderNumber = stripeSessionId.slice(-12).toUpperCase();
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? "https://ticketmint.vercel.app";
  try {
    const { data: tData } = await supabaseService
      .from("tickets")
      .select("seat_section, seat_row, seat_number, events(name)")
      .eq("id", ticketId).single();
    if (tData) {
      const evName  = (tData.events as any)?.name ?? "Event";
      const seatStr = `Sec ${tData.seat_section} Row ${tData.seat_row} #${tData.seat_number}`;
      const qrData  = JSON.stringify({
        ticketId, eventName: evName, seatInfo: seatStr, orderNumber,
        buyerEmail: session.customer_details?.email ?? "",
        verifyUrl: `${appUrl}/validate/${ticketId}`,
      });
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: 300, margin: 2, color: { dark: "#0F172A", light: "#FFFFFF" }, errorCorrectionLevel: "H",
      });
      await supabaseService.from("tickets").update({ qr_code: qrDataUrl }).eq("id", ticketId);
    }
  } catch (qrErr: any) {
    console.error("[Webhook] QR generation failed (non-fatal):", qrErr.message);
  }

  // ── 6. Send purchase confirmation email ───────────────────
  // Runs before on-chain logic so the buyer always receives a receipt
  // regardless of whether NFT minting is configured.
  const buyerEmail = session.customer_details?.email;
  if (buyerEmail) {
    try {
      const { data: ticketData } = await supabaseService
        .from("tickets")
        .select(`
          seat_section, seat_row, seat_number,
          events ( name, venue, city, event_date )
        `)
        .eq("id", ticketId)
        .single();

      if (ticketData) {
        const ev = ticketData.events as any;
        await sendPurchaseConfirmation({
          to:          buyerEmail,
          eventName:   ev.name,
          venue:       ev.venue,
          city:        ev.city,
          eventDate:   ev.event_date,
          seatSection: ticketData.seat_section,
          seatRow:     ticketData.seat_row,
          seatNumber:  ticketData.seat_number,
          quantity:    1,
          totalUsd:    ((session.amount_total ?? 0) / 100).toFixed(2),
          orderNumber,
          appUrl:      appUrl,
          ticketId:    ticketId,
        });
      }
    } catch (emailErr: any) {
      // Non-fatal — log but don't fail the webhook response
      console.error("[Webhook] Confirmation email failed:", emailErr.message);
    }
  }

  // ── 7. Attempt on-chain NFT transfer (best-effort) ────────
  // Skipped if mintAddress is absent (demo tickets / NFT not yet deployed).
  let txSig: string | null = null;
  if (mintAddress && sellerWallet) {
    try {
      txSig = await executeBuyTicket({
        mintAddress,
        buyerWallet,
        sellerWallet,
        ticketId,
      });
      console.log(`[Webhook] On-chain transfer complete. Tx: ${txSig}`);

      // Record transfer history only when we have a real on-chain tx
      await supabaseService.from("transfer_history").insert({
        ticket_id:      ticketId,
        mint_address:   mintAddress,
        from_wallet:    sellerWallet,
        to_wallet:      buyerWallet,
        transfer_type:  "buy",
        tx_signature:   txSig,
        transferred_at: now,
      });
    } catch (err: any) {
      console.error("[Webhook] On-chain buy_ticket failed (non-fatal):", err.message);
      // Don't return early — ticket is already sold in DB and email is sent
    }
  } else {
    console.log("[Webhook] mintAddress not set — skipping on-chain NFT transfer.");
  }

  // ── 8. Mark session complete ──────────────────────────────
  await supabaseService
    .from("stripe_sessions")
    .update({
      status:       "complete",
      completed_at: now,
      ...(txSig ? { on_chain_tx: txSig } : {}),
    })
    .eq("stripe_session_id", stripeSessionId);

  return NextResponse.json({ received: true, txSig });
}
