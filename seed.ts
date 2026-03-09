#!/usr/bin/env ts-node
// ── seed.ts — Admin seed script ──────────────────────────────
// Creates 5 sample events + demo ticket listings in Supabase.
// Optionally mints demo NFTs if SEED_MINT_NFTS=true is set.
//
// Usage:
//   npx ts-node seed.ts
//   SEED_MINT_NFTS=true npx ts-node seed.ts
//
// Requires:
//   - .env.local with SUPABASE_SERVICE_ROLE_KEY
//   - For minting: PLATFORM_KEYPAIR_SECRET with funded devnet wallet

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Sample Events ─────────────────────────────────────────────
const EVENTS = [
  {
    name:        "Taylor Swift — The Eras Tour",
    venue:       "SoFi Stadium",
    city:        "Los Angeles, CA",
    event_date:  "2026-06-15T20:00:00Z",
    image_url:   null,
    description: "Taylor Swift's record-breaking Eras Tour. All albums. One night.",
  },
  {
    name:        "NFL Championship — Chiefs vs. Eagles",
    venue:       "Arrowhead Stadium",
    city:        "Kansas City, MO",
    event_date:  "2026-09-07T13:00:00Z",
    image_url:   null,
    description: "Season opener matchup. Premium NFL action.",
  },
  {
    name:        "NBA Finals Game 7",
    venue:       "Chase Center",
    city:        "San Francisco, CA",
    event_date:  "2026-07-22T20:30:00Z",
    image_url:   null,
    description: "The ultimate Game 7 experience. History in the making.",
  },
  {
    name:        "Coachella Valley Music and Arts Festival",
    venue:       "Empire Polo Club",
    city:        "Indio, CA",
    event_date:  "2026-04-11T12:00:00Z",
    image_url:   null,
    description: "Weekend 1 passes. Headliners TBA. Desert vibes guaranteed.",
  },
  {
    name:        "UFC 315 — Championship Night",
    venue:       "T-Mobile Arena",
    city:        "Las Vegas, NV",
    event_date:  "2026-12-06T18:00:00Z",
    image_url:   null,
    description: "Three title fights. One epic night of combat sports.",
  },
];

// ── Sample Seats ──────────────────────────────────────────────
// Generate a few tickets per event
const SEAT_CONFIGS = [
  { seat_section: "Floor A", seat_row: "1",  seat_number: "12", price_sol: 2.5   },
  { seat_section: "Floor A", seat_row: "3",  seat_number: "7",  price_sol: 2.1   },
  { seat_section: "Section 101", seat_row: "5",  seat_number: "22", price_sol: 1.2 },
  { seat_section: "Section 202", seat_row: "12", seat_number: "8",  price_sol: 0.8 },
  { seat_section: "VIP",         seat_row: "VIP", seat_number: "1", price_sol: 5.0 },
  { seat_section: "Upper Deck",  seat_row: "20", seat_number: "15", price_sol: 0.4 },
];

const LAMPORTS_PER_SOL = 1_000_000_000;

// A demo seller wallet — replace with your actual test wallet
const DEMO_SELLER_WALLET =
  process.env.DEMO_SELLER_WALLET ??
  "11111111111111111111111111111111"; // System program as placeholder

async function main() {
  console.log("🌱 Ticket Mint Seed Script");
  console.log("─────────────────────────────");

  // ── 1. Seed events ────────────────────────────────────────
  console.log("\n📅 Seeding events…");

  // Upsert events by name — updates dates on existing events, inserts new ones.
  // Requires the unique constraint on events.name (present in schema.sql).
  const eventNames = EVENTS.map((e) => e.name);
  const { error: eventsError } = await supabase
    .from("events")
    .upsert(EVENTS, { onConflict: "name" });

  if (eventsError) {
    console.error("❌ Events upsert failed:", eventsError.message);
    process.exit(1);
  }

  // Fetch all seeded events (existing + newly inserted) for ticket creation
  const { data: insertedEvents, error: fetchError } = await supabase
    .from("events")
    .select()
    .in("name", eventNames);

  if (fetchError) {
    console.error("❌ Failed to fetch events:", fetchError.message);
    process.exit(1);
  }

  console.log(`✅ Events upserted: ${insertedEvents?.length ?? 0}`);

  // ── 2. Seed demo tickets ──────────────────────────────────
  console.log("\n🎟️  Seeding demo tickets…");

  // Find which events already have tickets so we don't duplicate on re-runs
  const allEventIds = (insertedEvents ?? []).map((e: any) => e.id);
  const { data: existingTickets } = await supabase
    .from("tickets")
    .select("event_id")
    .in("event_id", allEventIds);
  const seededEventIds = new Set((existingTickets ?? []).map((t: any) => t.event_id));

  let ticketCount = 0;
  for (const event of insertedEvents ?? []) {
    if (seededEventIds.has(event.id)) {
      console.log(`  ⏭️  Skipping ${event.name} — tickets already exist`);
      continue;
    }
    for (const seat of SEAT_CONFIGS) {
      const priceLamports = Math.round(seat.price_sol * LAMPORTS_PER_SOL);

      const { error: ticketError } = await supabase
        .from("tickets")
        .insert({
          event_id:       event.id,
          seller_wallet:  DEMO_SELLER_WALLET,
          seat_section:   seat.seat_section,
          seat_row:       seat.seat_row,
          seat_number:    seat.seat_number,
          price_lamports: priceLamports,
          original_price: priceLamports,
          listing_status: "listed",
        });

      if (ticketError) {
        console.warn(`  ⚠️  Ticket insert warning: ${ticketError.message}`);
      } else {
        ticketCount++;
      }
    }
  }

  console.log(`✅ Seeded ${ticketCount} demo tickets`);

  // ── 3. Summary ────────────────────────────────────────────
  console.log("\n─────────────────────────────");
  console.log("✅ Seed complete!");
  console.log(`   Events:  ${insertedEvents?.length ?? 0}`);
  console.log(`   Tickets: ${ticketCount}`);
  console.log("\n💡 Next steps:");
  console.log("   1. Open http://localhost:3000");
  console.log("   2. Connect Phantom wallet (devnet)");
  console.log("   3. Go to /list-ticket to mint + list a real NFT ticket");
  console.log("   4. View on Solscan: https://solscan.io/?cluster=devnet");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
