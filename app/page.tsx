// ── Marketplace Homepage (Server Component) ───────────────────
import { Suspense } from "react";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { TicketCard } from "@/components/TicketCard";
import { SearchFilters } from "@/components/SearchFilters";
import { HeroSearch } from "@/components/HeroSearch";
import { CategoryPills } from "@/components/CategoryPills";

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

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  concerts: ["Taylor Swift", "Beyonce", "Concert", "Tour", "Music", "Show", "Eras"],
  sports:   ["NFL", "NBA", "UFC", "Super Bowl", "Championship", "Finals", "Game", "Match"],
  festival: ["Coachella", "Festival", "Fest"],
  theater:  ["Theater", "Theatre", "Broadway", "Opera", "Ballet"],
  comedy:   ["Comedy", "Stand-Up", "Stand Up", "Laugh"],
};

// Updated to 2026 dates
const FEATURED_EVENTS = [
  {
    id:        "taylor-swift",
    name:      "Taylor Swift",
    subtitle:  "The Eras Tour",
    date:      "Jun 15, 2026",
    venue:     "SoFi Stadium",
    city:      "Los Angeles, CA",
    priceFrom: 350,
    category:  "Concert",
    gradient:  "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)",
    emoji:     "🎤",
  },
  {
    id:        "nfl-championship",
    name:      "NFL Championship",
    subtitle:  "Chiefs vs. Eagles",
    date:      "Sep 7, 2026",
    venue:     "Arrowhead Stadium",
    city:      "Kansas City, MO",
    priceFrom: 2500,
    category:  "Sports",
    gradient:  "linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)",
    emoji:     "🏈",
  },
  {
    id:        "coachella",
    name:      "Coachella 2026",
    subtitle:  "Valley Music & Arts Festival",
    date:      "Apr 11, 2026",
    venue:     "Empire Polo Club",
    city:      "Indio, CA",
    priceFrom: 480,
    category:  "Festival",
    gradient:  "linear-gradient(135deg, #D97706 0%, #EA580C 100%)",
    emoji:     "🎡",
  },
  {
    id:        "nba-finals",
    name:      "NBA Finals",
    subtitle:  "Game 7 — Chase Center",
    date:      "Jul 22, 2026",
    venue:     "Chase Center",
    city:      "San Francisco, CA",
    priceFrom: 280,
    category:  "Sports",
    gradient:  "linear-gradient(135deg, #0284C7 0%, #0891B2 100%)",
    emoji:     "🏀",
  },
  {
    id:        "ufc-315",
    name:      "UFC 315",
    subtitle:  "Championship Night",
    date:      "Dec 6, 2026",
    venue:     "T-Mobile Arena",
    city:      "Las Vegas, NV",
    priceFrom: 180,
    category:  "Sports",
    gradient:  "linear-gradient(135deg, #DC2626 0%, #7C2D12 100%)",
    emoji:     "🥊",
  },
  {
    id:        "beyonce",
    name:      "Beyoncé",
    subtitle:  "Renaissance World Tour",
    date:      "Sep 3, 2026",
    venue:     "Madison Square Garden",
    city:      "New York, NY",
    priceFrom: 420,
    category:  "Concert",
    gradient:  "linear-gradient(135deg, #7C3AED 0%, #B45309 100%)",
    emoji:     "💃",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: "Browse Events",
    body: "Search thousands of verified tickets for concerts, sports, festivals, and more. Filter by date, price, and section.",
  },
  {
    step: "02",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
    title: "Select Your Seats",
    body: "Choose your perfect seats and pay securely with card, Apple Pay, or Google Pay. Every ticket is blockchain-verified.",
  },
  {
    step: "03",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Instant Delivery",
    body: "Your ticket arrives as an NFT instantly. Show your QR code at the gate. No waiting, no printing, no hassle.",
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

  let query = supabaseServer
    .from("tickets")
    .select(`
      id, mint_address, seller_wallet,
      seat_section, seat_row, seat_number,
      price_lamports, listing_status, listed_at,
      events ( id, name, venue, city, event_date, image_url )
    `)
    .eq("listing_status", "listed");

  if (sort === "price_asc")       query = query.order("price_lamports", { ascending: true });
  else if (sort === "price_desc") query = query.order("price_lamports", { ascending: false });
  else                            query = query.order("listed_at", { ascending: false });

  if (searchParams.q) {
    const { data: matchingEvents } = await supabaseServer
      .from("events").select("id").ilike("name", `%${searchParams.q}%`);
    const ids = matchingEvents?.map((e) => e.id) ?? [];
    query = ids.length === 0
      ? query.eq("event_id", "00000000-0000-0000-0000-000000000000")
      : query.in("event_id", ids);
  }

  if (searchParams.category && searchParams.category !== "all") {
    const keywords = CATEGORY_KEYWORDS[searchParams.category] ?? [];
    if (keywords.length > 0) {
      const { data: catEvents } = await supabaseServer
        .from("events").select("id")
        .or(keywords.map((k) => `name.ilike.%${k}%`).join(","));
      const ids = catEvents?.map((e) => e.id) ?? [];
      query = ids.length === 0
        ? query.eq("event_id", "00000000-0000-0000-0000-000000000000")
        : query.in("event_id", ids);
    }
  }

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

  if (sort === "date_asc") {
    typedTickets = [...typedTickets].sort(
      (a, b) => new Date(a.events.event_date).getTime() - new Date(b.events.event_date).getTime()
    );
  }

  if (qty > 1) {
    const eventCount = new Map<string, number>();
    for (const t of typedTickets) eventCount.set(t.events.id, (eventCount.get(t.events.id) ?? 0) + 1);
    typedTickets = typedTickets.filter((t) => (eventCount.get(t.events.id) ?? 0) >= qty);
  }

  const eventMinPrice = new Map<string, number>();
  for (const t of typedTickets) {
    const cur = eventMinPrice.get(t.events.id);
    if (cur === undefined || t.price_lamports < cur) eventMinPrice.set(t.events.id, t.price_lamports);
  }
  const bestValueIds = new Set(
    typedTickets.filter((t) => t.price_lamports === eventMinPrice.get(t.events.id)).map((t) => t.id)
  );

  const hasActiveFilter =
    searchParams.q || searchParams.category || searchParams.minPrice ||
    searchParams.maxPrice || searchParams.section || searchParams.dateFrom ||
    searchParams.dateTo || (qty > 1);

  return (
    <div>
      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{
        background: "linear-gradient(160deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)",
        minHeight: "520px",
      }}>
        {/* Animated dot grid */}
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />
        {/* Coral glow */}
        <div aria-hidden className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(232,49,90,0.18) 0%, transparent 65%)",
        }} />
        {/* Purple glow */}
        <div aria-hidden className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 65%)",
        }} />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-20 pb-20 text-center">
          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-xs
                          font-semibold px-4 py-1.5 rounded-full mb-7 border border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8315A] animate-pulse" />
            100% verified &amp; guaranteed
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.06] mb-6">
            Get tickets to
            <br />
            <span className="text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(90deg, #E8315A, #A855F7)" }}>
              unforgettable moments.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/70 mb-10 max-w-xl mx-auto leading-relaxed">
            The smarter way to buy and resell event tickets.
            Verified, instant, and always at the right price.
          </p>

          {/* Search bar — larger */}
          <div className="w-full max-w-2xl mx-auto mb-10">
            <Suspense fallback={<HeroSearchSkeleton />}>
              <HeroSearch />
            </Suspense>
          </div>

          {/* Trust stats */}
          <div className="flex flex-wrap items-center justify-center gap-8">
            {[
              { value: "10K+",    label: "Tickets sold" },
              { value: "100%",    label: "Verified & guaranteed" },
              { value: "Instant", label: "Delivery" },
              { value: "2.5%",    label: "Lowest fees" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-extrabold text-white">{s.value}</div>
                <div className="text-xs text-white/50 mt-0.5 font-medium uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORY PILLS ────────────────────────────────────── */}
      <div className="bg-white border-b border-[#E2E8F0] py-4 sticky top-16 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Suspense fallback={null}>
            <CategoryPills />
          </Suspense>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-16">

        {/* ── HOW IT WORKS (shown only on clean homepage) ──────── */}
        {!hasActiveFilter && (
          <section className="text-center">
            <p className="text-xs font-bold text-[#E8315A] uppercase tracking-widest mb-3">Simple &amp; secure</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-12">How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={step.step} className="relative">
                  {/* Connector line between steps */}
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden sm:block absolute top-8 left-[calc(50%+40px)] right-[-calc(50%-40px)]
                                    h-px bg-gradient-to-r from-[#E2E8F0] to-[#E2E8F0] z-0" />
                  )}
                  <div className="relative z-10 flex flex-col items-center text-center p-6 bg-white rounded-2xl
                                  border border-[#E2E8F0]"
                       style={{ boxShadow: "0 2px 12px rgba(15,23,42,0.06)" }}>
                    <div className="w-14 h-14 rounded-2xl bg-[#FFF0F3] flex items-center justify-center
                                    text-[#E8315A] mb-4">
                      {step.icon}
                    </div>
                    <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">
                      Step {step.step}
                    </div>
                    <h3 className="font-bold text-[#0F172A] text-lg mb-2">{step.title}</h3>
                    <p className="text-sm text-[#64748B] leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── FEATURED EVENTS (only shown when no filter active) ── */}
        {!hasActiveFilter && (
          <section>
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs font-bold text-[#E8315A] uppercase tracking-widest mb-1">Don't miss out</p>
                <h2 className="text-2xl font-extrabold text-[#0F172A]">Featured Events</h2>
              </div>
              <span className="text-sm text-[#64748B] hidden sm:block">All upcoming · 2026</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURED_EVENTS.map((ev) => (
                <FeaturedEventCard key={ev.id} event={ev} />
              ))}
            </div>
          </section>
        )}

        {/* ── LISTED TICKETS ────────────────────────────────────── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-extrabold text-[#0F172A]">
                {hasActiveFilter ? "Search Results" : "Available Now"}
              </h2>
              <p className="text-sm text-[#64748B] mt-0.5">
                {typedTickets.length} ticket{typedTickets.length !== 1 ? "s" : ""} found
              </p>
            </div>
            {hasActiveFilter && <ActiveFilterChips searchParams={searchParams} />}
          </div>

          <div className="mb-6">
            <Suspense fallback={null}>
              <SearchFilters />
            </Suspense>
          </div>

          {typedTickets.length === 0 ? (
            <EmptyState query={searchParams.q} category={searchParams.category} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {typedTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} isBestValue={bestValueIds.has(ticket.id)} />
              ))}
            </div>
          )}
        </section>

        {/* ── TRUST STRIP (bottom of page) ─────────────────────── */}
        {!hasActiveFilter && (
          <section className="bg-gradient-to-r from-[#0F172A] to-[#1E1B4B] rounded-2xl p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div>
                <h3 className="text-white font-extrabold text-xl mb-1">Shop with confidence</h3>
                <p className="text-white/60 text-sm">
                  Every ticket is blockchain-verified and backed by our 100% buyer guarantee.
                </p>
              </div>
              <Link
                href="/guarantee"
                className="bg-white text-[#0F172A] font-bold px-6 py-3 rounded-xl text-sm
                           hover:bg-[#F8F9FA] transition-colors flex-shrink-0 min-h-[44px] flex items-center"
              >
                View Buyer Guarantee →
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ── Featured Event Card ───────────────────────────────────────
function FeaturedEventCard({ event }: { event: (typeof FEATURED_EVENTS)[number] }) {
  return (
    <div className="group bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden
                    transition-all duration-200 hover:shadow-xl hover:-translate-y-1"
         style={{ boxShadow: "0 2px 12px rgba(15,23,42,0.06)" }}>
      <div className="h-40 relative flex items-end p-5" style={{ background: event.gradient }}>
        <span className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white text-[10px]
                         font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/30">
          {event.category}
        </span>
        <span className="absolute top-4 right-4 text-4xl group-hover:scale-110 transition-transform">
          {event.emoji}
        </span>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="relative z-10">
          <h3 className="text-white font-extrabold text-lg leading-tight">{event.name}</h3>
          <p className="text-white/75 text-sm">{event.subtitle}</p>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="space-y-0.5 min-w-0">
            <p className="font-semibold text-[#0F172A] text-sm truncate">{event.venue}</p>
            <p className="text-[#64748B] text-xs">{event.city}</p>
            <p className="text-[#64748B] text-xs flex items-center gap-1 mt-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {event.date}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-[#94A3B8] font-semibold uppercase">From</p>
            <p className="text-2xl font-extrabold text-[#0F172A]">${event.priceFrom.toLocaleString()}</p>
          </div>
        </div>

        <Link
          href={`/?q=${encodeURIComponent(event.name)}`}
          className="block w-full text-center btn-primary py-3 text-sm font-bold rounded-xl min-h-[44px] flex items-center justify-center"
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
  const chips: { label: string }[] = [];
  if (searchParams.q)        chips.push({ label: `"${searchParams.q}"` });
  if (searchParams.category) chips.push({ label: searchParams.category });
  if (searchParams.minPrice) chips.push({ label: `From $${searchParams.minPrice}` });
  if (searchParams.maxPrice) chips.push({ label: `Up to $${searchParams.maxPrice}` });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-[#94A3B8] font-medium">Filters:</span>
      {chips.map((chip) => (
        <span key={chip.label}
              className="inline-flex items-center gap-1 bg-[#FFF0F3] text-[#E8315A] text-xs
                         font-semibold px-3 py-1 rounded-full border border-[#FECDD3]">
          {chip.label}
        </span>
      ))}
      <a href="/" className="text-xs text-[#64748B] hover:text-[#E8315A] underline transition-colors ml-1">
        Clear all
      </a>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ query, category }: { query?: string; category?: string }) {
  const what = query ? `"${query}"` : category ? `${category} events` : "tickets";
  return (
    <div className="text-center py-24 bg-white rounded-2xl border border-[#E2E8F0]">
      <div className="w-16 h-16 bg-[#F8F9FA] rounded-2xl flex items-center justify-center mx-auto mb-5">
        <span className="text-3xl">🔍</span>
      </div>
      <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No tickets found for {what}</h3>
      <p className="text-[#64748B] text-sm mb-2 max-w-xs mx-auto">
        Check back soon — new listings are added every day.
      </p>
      <p className="text-[#94A3B8] text-xs mb-6">Try broadening your search or clearing filters.</p>
      <a href="/" className="btn-primary px-6 py-2.5 text-sm inline-block">
        Browse All Tickets
      </a>
    </div>
  );
}

function HeroSearchSkeleton() {
  return <div className="w-full max-w-2xl mx-auto h-[64px] bg-white/10 rounded-2xl animate-pulse" />;
}
