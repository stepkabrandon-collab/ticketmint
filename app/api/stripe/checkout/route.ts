// ── Create Stripe Checkout Session ───────────────────────────
// POST /api/stripe/checkout
// Called from the BuyTicketButton client component.
// Returns { url } — client redirects to Stripe hosted page.

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseService } from "@/lib/supabase";
import { lamportsToSol } from "@/lib/utils";

// Approximate SOL → USD rate.  In production, fetch from a price oracle.
const SOL_TO_USD = 150; // $150/SOL — update as needed

// Resolve the base URL — falls back to localhost in development if env var not set
function baseUrl(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const host = req.headers.get("host") ?? "localhost:3002";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const { ticketId, buyerWallet, buyerEmail } = await req.json();

    if (!ticketId || !buyerWallet) {
      return NextResponse.json({ error: "Missing ticketId or buyerWallet" }, { status: 400 });
    }

    // Fetch ticket + event from Supabase
    const { data: ticket, error: ticketError } = await supabaseService
      .from("tickets")
      .select(`
        id, mint_address, seller_wallet, price_lamports, listing_status,
        seat_section, seat_row, seat_number,
        events ( name, venue, city, event_date )
      `)
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error("[Checkout] Ticket fetch error:", ticketError?.message);
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.listing_status !== "listed") {
      return NextResponse.json({ error: "Ticket is not available" }, { status: 409 });
    }

    const event = ticket.events as any;
    const solPrice = lamportsToSol(ticket.price_lamports);
    const usdCents = Math.round(solPrice * SOL_TO_USD * 100);

    // Stripe requires unit_amount >= 50 cents
    if (usdCents < 50) {
      return NextResponse.json({ error: "Ticket price is too low to process" }, { status: 400 });
    }

    const appBase = baseUrl(req);

    // Create Stripe Checkout session.
    // mint_address may be null for demo tickets — NFT minting happens in the
    // webhook after payment is confirmed.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      // Prefill the email field on the Stripe-hosted page
      ...(buyerEmail ? { customer_email: buyerEmail } : {}),
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: usdCents,
            product_data: {
              name: `${event.name} — Sec ${ticket.seat_section} Row ${ticket.seat_row} #${ticket.seat_number}`,
              description: `${event.venue}, ${event.city} · ${new Date(event.event_date).toLocaleDateString()}`,
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      billing_address_collection: "auto",
      phone_number_collection: { enabled: false },
      success_url: `${appBase}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appBase}/marketplace/${ticketId}?payment=cancelled`,
      metadata: {
        ticketId:     ticket.id,
        buyerWallet:  buyerWallet,
        mintAddress:  ticket.mint_address ?? "",
        sellerWallet: ticket.seller_wallet,
      },
    });

    // Record pending session in Supabase for idempotency
    const { error: sessionInsertError } = await supabaseService
      .from("stripe_sessions")
      .insert({
        stripe_session_id: session.id,
        ticket_id:         ticket.id,
        buyer_wallet:      buyerWallet,
        buyer_email:       buyerEmail ?? null,
        amount_usd_cents:  usdCents,
        status:            "pending",
      });

    if (sessionInsertError) {
      // Non-fatal — log but don't block the redirect
      console.error("[Checkout] stripe_sessions insert error:", sessionInsertError.message);
    }

    // Link session to ticket; also cache buyer email for webhook use
    await supabaseService
      .from("tickets")
      .update({
        stripe_session_id: session.id,
        ...(buyerEmail ? { buyer_email: buyerEmail } : {}),
      })
      .eq("id", ticketId);

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    // Log the full error so it's visible in server logs / terminal
    console.error("[Checkout] Unhandled error:", err);
    const message = err?.raw?.message ?? err?.message ?? "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
