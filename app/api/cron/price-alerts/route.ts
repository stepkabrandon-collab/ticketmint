// ── Price Alert Cron ───────────────────────────────────────────
// GET /api/cron/price-alerts
// Scheduled via Vercel Cron every 6 hours (vercel.json).
// Checks all watchlist entries with a target_price and sends email
// alerts when tickets are available at or below that price.
// Secured with CRON_SECRET — Vercel passes this as Authorization header.

import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { sendPriceAlert } from "@/lib/emails/priceAlert";

export const runtime = "nodejs";

const SOL_TO_USD        = 150;
const LAMPORTS_PER_SOL  = 1_000_000_000;
// Re-alert at most once every 24 h per watchlist entry
const ALERT_COOLDOWN_H  = 24;

export async function GET(req: NextRequest) {
  // ── Auth check ───────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ticketmint.vercel.app";
  const cutoff = new Date(Date.now() - ALERT_COOLDOWN_H * 3600 * 1000).toISOString();

  // ── Fetch watchlist entries that have a target and an email ──
  const { data: entries, error } = await supabaseService
    .from("watchlist")
    .select(`
      id, user_wallet, user_email, target_price,
      events ( id, name, venue, city, event_date )
    `)
    .not("target_price", "is", null)
    .not("user_email",   "is", null)
    .or(`alerted_at.is.null,alerted_at.lt.${cutoff}`);

  if (error) {
    console.error("[PriceAlertCron] Watchlist fetch error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const entry of entries ?? []) {
    const ev = entry.events as any;
    if (!ev || !entry.user_email || entry.target_price == null) { skipped++; continue; }

    // Find the lowest available ticket price for this event
    const { data: cheapest } = await supabaseService
      .from("tickets")
      .select("price_lamports")
      .eq("event_id", ev.id)
      .eq("listing_status", "listed")
      .order("price_lamports", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!cheapest) { skipped++; continue; }

    const currentPriceUsd = Math.round((cheapest.price_lamports / LAMPORTS_PER_SOL) * SOL_TO_USD);
    const targetPriceUsd  = Math.round(entry.target_price / 100); // target stored in cents

    if (currentPriceUsd > targetPriceUsd) { skipped++; continue; }

    // Price is at or below target — send alert
    try {
      await sendPriceAlert({
        to:           entry.user_email,
        eventName:    ev.name,
        venue:        ev.venue,
        city:         ev.city,
        eventDate:    ev.event_date,
        currentPrice: currentPriceUsd,
        targetPrice:  targetPriceUsd,
        appUrl,
        searchQuery:  ev.name,
      });

      // Mark as alerted
      await supabaseService
        .from("watchlist")
        .update({ alerted_at: new Date().toISOString() })
        .eq("id", entry.id);

      sent++;
    } catch (emailErr: any) {
      console.error(`[PriceAlertCron] Email failed for ${entry.user_email}:`, emailErr.message);
    }
  }

  console.log(`[PriceAlertCron] Done. Sent: ${sent}, Skipped: ${skipped}`);
  return NextResponse.json({ sent, skipped, total: (entries ?? []).length });
}
