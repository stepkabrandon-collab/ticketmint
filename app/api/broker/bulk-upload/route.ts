// ── Broker Bulk CSV Upload ─────────────────────────────────────
// POST /api/broker/bulk-upload
// Accepts multipart/form-data with a 'file' (CSV) and optional 'sellerWallet'.
// Parses each row, finds or creates the event, and inserts ticket records.

import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

const SOL_TO_USD = 150;
const LAMPORTS_PER_SOL = 1_000_000_000;

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
}

export async function POST(req: NextRequest) {
  const formData    = await req.formData();
  const file        = formData.get("file") as File | null;
  const sellerWallet = (formData.get("sellerWallet") as string | null) ?? "11111111111111111111111111111111";

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length === 0) {
    return NextResponse.json({ uploaded: 0, failed: 0, errors: ["CSV is empty or malformed"] });
  }

  let uploaded = 0;
  let failed   = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row     = rows[i];
    const rowNum  = i + 2; // +2 = 1-indexed + header row
    const { event_name, event_date, venue, city, section, row: seatRow, seat, price_usd, quantity } = row;

    if (!event_name || !price_usd) {
      errors.push(`Row ${rowNum}: missing event_name or price_usd`);
      failed++; continue;
    }

    const priceUsd      = parseFloat(price_usd);
    const qty           = Math.max(1, parseInt(quantity ?? "1", 10) || 1);
    const priceLamports = Math.round((priceUsd / SOL_TO_USD) * LAMPORTS_PER_SOL);

    if (isNaN(priceUsd) || priceUsd <= 0) {
      errors.push(`Row ${rowNum}: invalid price "${price_usd}"`);
      failed++; continue;
    }

    // ── Find or create event ─────────────────────────────────
    let eventId: string;
    const { data: existingEvent } = await supabaseService
      .from("events")
      .select("id")
      .ilike("name", event_name.trim())
      .maybeSingle();

    if (existingEvent) {
      eventId = existingEvent.id;
    } else {
      // Create new event
      const { data: newEvent, error: eventErr } = await supabaseService
        .from("events")
        .insert({
          name:       event_name.trim(),
          venue:      venue?.trim() || "TBA",
          city:       city?.trim()  || "TBA",
          event_date: event_date ? new Date(event_date).toISOString() : new Date(Date.now() + 90 * 86400000).toISOString(),
        })
        .select("id")
        .single();

      if (eventErr || !newEvent) {
        errors.push(`Row ${rowNum}: failed to create event — ${eventErr?.message}`);
        failed++; continue;
      }
      eventId = newEvent.id;
    }

    // ── Insert qty tickets ────────────────────────────────────
    for (let q = 0; q < qty; q++) {
      const seatNum = qty > 1 ? String((parseInt(seat || "1", 10) || 1) + q) : (seat || "GA");
      const { error: ticketErr } = await supabaseService
        .from("tickets")
        .insert({
          event_id:       eventId,
          seller_wallet:  sellerWallet,
          seat_section:   section || "GA",
          seat_row:       seatRow  || "GA",
          seat_number:    seatNum,
          price_lamports: priceLamports,
          original_price: priceLamports,
          listing_status: "listed",
          listed_at:      new Date().toISOString(),
        });

      if (ticketErr) {
        errors.push(`Row ${rowNum} (seat ${seatNum}): ${ticketErr.message}`);
        failed++;
      } else {
        uploaded++;
      }
    }
  }

  return NextResponse.json({ uploaded, failed, errors });
}
