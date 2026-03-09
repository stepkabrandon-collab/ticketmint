// ── Marketplace Homepage (Server Component) ───────────────────
import { Suspense } from "react";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { TicketCard } from "@/components/TicketCard";
import { SearchFilters } from "@/components/SearchFilters";
import { HeroSearch } from "@/components/HeroSearch";
import { CategoryPills } from "@/components/CategoryPills";
import { lamportsToSol } from "@/lib/utils";

export interface TicketWithEvent {
  id: string;
  mint_address: string | null;
  seller_wallet: string;
  seat_section: string;
  seat_row: string;
  seat_number: string;
  price_lamports: number;
  listing_status: string;
  listed_at: string | null;
  events: {
    id: string;
    name: string;
    venue: string;
    city: string;
    event_date: string;
    image_url: string | null;
  };
}

export const revalidate = 30;

// ── Category → keyword mapping ─────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  concerts: ["Taylor Swift", "Beyonce", "Concert", "Tour", "Music", "Show"],
  sports:   ["NFL", "NBA", "UFC", "Super Bowl", "Championship", "Finals", "Game", "Match"],
  festival: ["Coachella", "Festival", "Fest"],
  theater:  ["Theater", "Theatre", "Broadway", "Opera", "Ballet"],
  comedy:   ["Comedy", "Stand-Up", "Stand Up", "Laugh"],
};

// ── Featured events — static mock data ────────────────────────
const FEATURED_EVENTS = [
  {
    id: "taylor-swift",
    name: "Taylor Swift",
    subtitle: "The Eras Tour",
    date: "Aug 15, 2025",
    venue: "SoFi Stadium",
    city: "Los Angeles, CA",
    priceFrom: 350,
    category: "Concert",
    gradient: "linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)",
    emoji: "🎤",
  },
  {
    id: "super-bowl",
    name: "Super Bowl LX",
    subtitle: "NFL Championship",
    date: "Feb 8, 2026",
    venue: "Levi's Stadium",
    city: "Santa Clara, CA",
    priceFrom: 2500,
    category: "Sports",
    gradient: "linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)",
    emoji: "🏈",
  },
  {
    id: "coachella",
    name: "Coachella 2025",
    subtitle: "Valley Music & Arts Festival",
    date: "Apr 11–13, 2025",
    venue: "Empire Polo Club",
    city: "Indio, CA",
    priceFrom: 480,
    category: "Festival",
    gradient: "linear-gradient(135deg, #D97706 0%, #EA580C 100%)",
    emoji: "🎡",
  },
  {
    id: "nba-finals",
    name: "NBA Finals",
    subtitle: "Game 7 — TBD",
    date: "Jun 22, 2025",
    venue: "Chase Center",
    city: "San Francisco, CA",
    priceFrom: 280,
    category: "Sports",
    gradient: "linear-gradient(135deg, #0284C7 0%, #0891B2 100%)",
    emoji: "🏀",
  },
  {
    id: "ufc-300",
    name: "UFC 310",
    subtitle: "Championship Night",
    date: "Dec 6, 2025",
    venue: "T-Mobile Arena",
    city: "Las Vegas, NV",
    priceFrom: 180,
    category: "Sports",
    gradient: "linear-gradient(135deg, #DC2626 0%, #7C2D12 100%)",
    emoji: "🥊",
  },
  {
    id: "beyonce",
    name: "Beyoncé",
    subtitle: "Renaissance World Tour",
    date: "Sep 3, 2025",
    venue: "Madison Square Garden",
    city: "New York, NY",
    priceFrom: 420,
    category: "Concert",
    gradient: "linear-gradient(135deg, #B45309 0%, #D97706 100%)",
    emoji: "💃",
  },
];

const SOL_TO_USD = 150;
const LAMPORTS_PER_SOL = 1_000_000_000;

export default async function HomePage({
  searchParams,
}: {
  searchParams: {
    q?:        string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    section?:  string;
    sort?:     string;
    dateFrom?: string;
    dateTo?:   string;
    qty?:      string;
  };
}) {
  const sort = searchParams.sort ?? "newest";
  const qty  = parseInt(searchParams.qty ?? "1", 10);

  // ── Build Supabase query ──────────────────────────────────────
  let query = supabaseServer
    .from("tickets")
    .select(`
      id, mint_address, seller_wallet,
      seat_section, seat_row, seat_number,
      price_lamports, listing_status, listed_at,
      events ( id, name, venue, city, event_date, image_url )
    `)
    .eq("listing_status", "listed");

  // Sorting
  if (sort === "price_asc")  query = query.order("price_lamports", { ascending: true });
  else if (sort === "price_desc") query = query.order("price_lamports", { ascending: false });
  else query = query.order("listed_at", { ascending: false }); // newest / date_asc sorted in JS

  // Text search
  if (searchParams.q) {
    const { data: matchingEvents } = await supabaseServer
      .from("events")
      .select("id")
      .ilike("name", `%${searchParams.q}%`);
    const ids = matchingEvents?.map((e) => e.id) ?? [];
    query = ids.length === 0
      ? query.eq("event_id", "00000000-0000-0000-0000-000000000000")
      : query.in("event_id", ids);
  }

  // Category filter
  if (searchParams.category && searchParams.category !== "all") {
    const keywords = CATEGORY_KEYWORDS[searchParams.category] ?? [];
    if (keywords.length > 0) {
      const { data: catEvents } = await supabaseServer
        .from("events")
        .select("id")
        .or(keywords.map((k) => `name.ilike.%${k}%`).join(","));
      const ids = catEvents?.map((e) => e.id) ?? [];
      query = ids.length === 0
        ? query.eq("event_id", "00000000-0000-0000-0000-000000000000")
        : query.in("event_id", ids);
    }
  }

  // Date range filter — match events within range
  if (searchParams.dateFrom || searchParams.dateTo) {
    let dateQ = supabaseServer.from("events").select("id");
    if (searchParams.dateFrom) dateQ = dateQ.gte("event_date", searchParams.dateFrom);
    if (searchParams.dateTo)   dateQ = dateQ.lte("event_date", searchParams.dateTo + "T23:59:59Z");
    const { data: dateEvents } = await dateQ;
    const ids = dateEvents?.map((e) => e.id) ?? [];
    query = ids.length === 0
      ? query.eq("event_id", "00000000-0000-0000-0000-000000000000")
      : query.in("event_id", ids);
  }

  // Price filter (USD → lamports: USD / 150 * 1e9)
  const lamportsPerDollar = LAMPORTS_PER_SOL / SOL_TO_USD;
  if (searchParams.minPrice)
    query = query.gte("price_lamports", Math.round(Number(searchParams.minPrice) * lamportsPerDollar));
  if (searchParams.maxPrice)
    query = query.lte("price_lamports", Math.round(Number(searchParams.maxPrice) * lamportsPerDollar));
  if (searchParams.section)
    query = query.ilike("seat_section", `%${searchParams.section}%`);

  const { data: tickets, error } = await query;
  if (error) console.error("[HomePage] Supabase error:", error.message);

  let typedTickets = (tickets ?? []) as unknown as TicketWithEvent[];

  // Date sort — JS post-process (can't order by related table column in PostgREST)
  if (sort === "date_asc") {
    typedTickets = [...typedTickets].sort(
      (a, b) => new Date(a.events.event_date).getTime() - new Date(b.events.event_date).getTime()
    );
  }

  // Quantity filter — only show events that have qty+ tickets available
  if (qty > 1) {
    const eventCount = new Map<string, number>();
    for (const t of typedTickets) {
      eventCount.set(t.events.id, (eventCount.get(t.events.id) ?? 0) + 1);
    }
    typedTickets = typedTickets.filter((t) => (eventCount.get(t.events.id) ?? 0) >= qty);
  }

  // Best value — cheapest ticket per event
  const eventMinPrice = new Map<string, number>();
  for (const t of typedTickets) {
    const cur = eventMinPrice.get(t.events.id);
    if (cur === undefined || t.price_lamports < cur) {
      eventMinPrice.set(t.events.id, t.price_lamports);
    }
  }
  const bestValueIds = new Set(
    typedTickets
      .filter((t) => t.price_lamports === eventMinPrice.get(t.events.id))
      .map((t) => t.id)
  );

  const hasActiveFilter =
    searchParams.q || searchParams.category || searchParams.minPrice ||
    searchParams.maxPrice || searchParams.section || searchParams.dateFrom ||
    searchParams.dateTo || (qty > 1);

  return (
    <div>
      {/* ── HERO ──────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #FFF5F7 0%, #F8F9FA 100%)",
        }}
      >
        {/* Subtle dot-grid pattern */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#E2E8F0 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
            opacity: 0.7,
          }}
        />
        {/* Coral glow blobs */}
        <div
          aria-hidden
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(232,49,90,0.07) 0%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-16 pb-14 text-center">
          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 bg-white text-[#E8315A] text-xs
                          font-semibold px-4 py-1.5 rounded-full mb-6 border border-[#FECDD3]"
               style={{ boxShadow: "0 1px 4px rgba(232,49,90,0.15)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8315A]" />
            100% verified &amp; guaranteed
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight
                         text-[#0F172A] leading-[1.08] mb-5">
            The tickets you want,
            <br />
            <span className="text-[#E8315A]">at the price you choose.</span>
          </h1>

          <p className="text-lg sm:text-xl text-[#64748B] mb-10 max-w-xl mx-auto leading-relaxed">
            Buy and resell tickets to concerts, sports, festivals and more.
            Every ticket is 100% verified and delivered instantly.
          </p>

          {/* Search bar */}
          <Suspense fallback={<HeroSearchSkeleton />}>
            <HeroSearch />
          </Suspense>

          {/* Stats */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
            {[
              { value: typedTickets.length.toString(), label: "Tickets available" },
              { value: "2.5%",                         label: "Service fee" },
              { value: "Instant",                      label: "Delivery" },
              { value: "100%",                         label: "Authenticity guarantee" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-extrabold text-[#0F172A]">{s.value}</div>
                <div className="text-xs text-[#94A3B8] mt-0.5 font-medium uppercase tracking-wide">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORY PILLS ────────────────────────────────────── */}
      <div className="bg-white border-b border-[#E2E8F0] py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Suspense fallback={null}>
            <CategoryPills />
          </Suspense>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-12">

        {/* ── FEATURED EVENTS (only shown when no filter active) ── */}
        {!hasActiveFilter && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-extrabold text-[#0F172A]">Featured Events</h2>
              <span className="text-sm text-[#64748B]">Handpicked for you</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURED_EVENTS.map((ev) => (
                <FeaturedEventCard key={ev.id} event={ev} />
              ))}
            </div>
          </section>
        )}

        {/* ── LISTED TICKETS ────────────────────────────────────── */}
        <section>
          {/* Section header + refine filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-extrabold text-[#0F172A]">
                {hasActiveFilter ? "Search Results" : "Available Now"}
              </h2>
              <p className="text-sm text-[#64748B] mt-0.5">
                {typedTickets.length} ticket{typedTickets.length !== 1 ? "s" : ""} found
              </p>
            </div>

            {/* Active filter chips */}
            {hasActiveFilter && (
              <ActiveFilterChips searchParams={searchParams} />
            )}
          </div>

          {/* Refine bar */}
          <div className="mb-6">
            <Suspense fallback={null}>
              <SearchFilters />
            </Suspense>
          </div>

          {typedTickets.length === 0 ? (
            <EmptyState query={searchParams.q} category={searchParams.category} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {typedTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} isBestValue={bestValueIds.has(ticket.id)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Featured Event Card ───────────────────────────────────────
function FeaturedEventCard({
  event,
}: {
  event: (typeof FEATURED_EVENTS)[number];
}) {
  return (
    <div className="group bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden
                    transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
         style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
      {/* Event image / gradient banner */}
      <div
        className="h-36 relative flex items-end p-4"
        style={{ background: event.gradient }}
      >
        {/* Category badge */}
        <span className="absolute top-3 left-3 bg-white/20 backdrop-blur-sm text-white
                          text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full
                          border border-white/30">
          {event.category}
        </span>
        {/* Emoji */}
        <span className="absolute top-3 right-4 text-3xl">{event.emoji}</span>
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="relative">
          <h3 className="text-white font-extrabold text-lg leading-tight">{event.name}</h3>
          <p className="text-white/75 text-sm">{event.subtitle}</p>
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="text-sm text-[#334155] space-y-0.5">
            <p className="font-semibold text-[#0F172A]">{event.venue}</p>
            <p className="text-[#64748B] text-xs">{event.city}</p>
            <p className="text-[#64748B] text-xs">{event.date}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-[#94A3B8] font-medium">From</p>
            <p className="text-xl font-extrabold text-[#0F172A]">
              ${event.priceFrom.toLocaleString()}
            </p>
          </div>
        </div>

        <Link
          href={`/?q=${encodeURIComponent(event.name)}`}
          className="block w-full text-center btn-primary py-2.5 text-sm font-semibold rounded-xl"
        >
          View Tickets
        </Link>
      </div>
    </div>
  );
}

// ── Active filter chips ───────────────────────────────────────
function ActiveFilterChips({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; minPrice?: string; maxPrice?: string };
}) {
  const chips: { label: string; clearParam: string }[] = [];
  if (searchParams.q)        chips.push({ label: `"${searchParams.q}"`,           clearParam: "q" });
  if (searchParams.category) chips.push({ label: searchParams.category,            clearParam: "category" });
  if (searchParams.minPrice) chips.push({ label: `From $${searchParams.minPrice}`, clearParam: "minPrice" });
  if (searchParams.maxPrice) chips.push({ label: `Up to $${searchParams.maxPrice}`,clearParam: "maxPrice" });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-[#94A3B8] font-medium">Filters:</span>
      {chips.map((chip) => (
        <span
          key={chip.clearParam}
          className="inline-flex items-center gap-1 bg-[#FFF0F3] text-[#E8315A] text-xs
                     font-semibold px-3 py-1 rounded-full border border-[#FECDD3]"
        >
          {chip.label}
        </span>
      ))}
      <a
        href="/"
        className="text-xs text-[#64748B] hover:text-[#E8315A] underline transition-colors ml-1"
      >
        Clear all
      </a>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ query, category }: { query?: string; category?: string }) {
  const what = query ? `"${query}"` : category ? `${category} events` : "tickets";
  return (
    <div className="text-center py-20 bg-white rounded-2xl border border-[#E2E8F0]">
      <div className="w-16 h-16 bg-[#F8F9FA] rounded-2xl flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">🔍</span>
      </div>
      <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No tickets found for {what}</h3>
      <p className="text-[#64748B] text-sm mb-6">
        Try a different search or browse all events.
      </p>
      <a href="/" className="btn-primary px-6 py-2.5 text-sm inline-block">
        Browse All Tickets
      </a>
    </div>
  );
}

// ── Loading skeleton for hero search ─────────────────────────
function HeroSearchSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto h-[58px] bg-white/80 rounded-2xl
                    border-2 border-[#E2E8F0] animate-pulse" />
  );
}
