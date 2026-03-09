// ── Watchlist API ─────────────────────────────────────────────
// GET  /api/watchlist?wallet=xxx             → list all items for wallet
// GET  /api/watchlist?wallet=xxx&eventId=yyy → check if watching one event
// POST /api/watchlist    { wallet, eventId, targetPrice? }  → add
// DELETE /api/watchlist  { wallet, eventId }                → remove

import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const wallet  = req.nextUrl.searchParams.get("wallet");
  const eventId = req.nextUrl.searchParams.get("eventId");

  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet" }, { status: 400 });
  }

  // Single event check
  if (eventId) {
    const { data } = await supabaseService
      .from("watchlist")
      .select("id, target_price")
      .eq("user_wallet", wallet)
      .eq("event_id", eventId)
      .maybeSingle();
    return NextResponse.json({ watching: !!data, targetPrice: data?.target_price ?? null });
  }

  // Full watchlist
  const { data, error } = await supabaseService
    .from("watchlist")
    .select(`
      id, target_price, created_at,
      events ( id, name, venue, city, event_date )
    `)
    .eq("user_wallet", wallet)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Watchlist GET] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { wallet, eventId, targetPrice } = await req.json();

  if (!wallet || !eventId) {
    return NextResponse.json({ error: "Missing wallet or eventId" }, { status: 400 });
  }

  const { error } = await supabaseService
    .from("watchlist")
    .upsert(
      {
        user_wallet:  wallet,
        event_id:     eventId,
        target_price: targetPrice ?? null,
      },
      { onConflict: "user_wallet,event_id" }
    );

  if (error) {
    console.error("[Watchlist POST] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { wallet, eventId } = await req.json();

  if (!wallet || !eventId) {
    return NextResponse.json({ error: "Missing wallet or eventId" }, { status: 400 });
  }

  const { error } = await supabaseService
    .from("watchlist")
    .delete()
    .eq("user_wallet", wallet)
    .eq("event_id", eventId);

  if (error) {
    console.error("[Watchlist DELETE] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
