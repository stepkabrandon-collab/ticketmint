// ── TicketCard ─────────────────────────────────────────────────
// Premium browse card — event image band, clean price, buy button.
// Seat details are intentionally omitted here; they live on the detail page.
import Link from "next/link";
import type { TicketWithEvent } from "@/app/page";
import { lamportsToSol } from "@/lib/utils";

// Category detection from event name
function getEventStyle(name: string): { gradient: string; emoji: string; category: string } {
  const n = name.toLowerCase();
  if (n.includes("swift") || n.includes("beyonce") || n.includes("concert") || n.includes("tour") || n.includes("eras")) {
    return { gradient: "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)", emoji: "🎤", category: "Concert" };
  }
  if (n.includes("nfl") || n.includes("nba") || n.includes("ufc") || n.includes("bowl") || n.includes("finals") || n.includes("championship") || n.includes("chiefs") || n.includes("eagles")) {
    return { gradient: "linear-gradient(135deg, #1D4ED8 0%, #0891B2 100%)", emoji: "🏆", category: "Sports" };
  }
  if (n.includes("coachella") || n.includes("festival") || n.includes("fest")) {
    return { gradient: "linear-gradient(135deg, #D97706 0%, #EA580C 100%)", emoji: "🎡", category: "Festival" };
  }
  if (n.includes("comedy") || n.includes("stand-up") || n.includes("laugh")) {
    return { gradient: "linear-gradient(135deg, #CA8A04 0%, #F59E0B 100%)", emoji: "😄", category: "Comedy" };
  }
  if (n.includes("theater") || n.includes("theatre") || n.includes("broadway") || n.includes("opera")) {
    return { gradient: "linear-gradient(135deg, #065F46 0%, #0891B2 100%)", emoji: "🎭", category: "Theater" };
  }
  return { gradient: "linear-gradient(135deg, #E8315A 0%, #7C3AED 100%)", emoji: "🎟", category: "Event" };
}

export function TicketCard({ ticket, isBestValue }: { ticket: TicketWithEvent; isBestValue?: boolean }) {
  const ev       = ticket.events;
  const solPrice = lamportsToSol(ticket.price_lamports);
  const usdPrice = Math.round(solPrice * 150);
  const style    = getEventStyle(ev.name);
  const eventDate = new Date(ev.event_date);
  // UTC-safe comparison: compare timestamps directly
  const isUpcoming = eventDate.getTime() > Date.now();

  const formattedDate = eventDate.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const dayOfWeek = eventDate.toLocaleDateString("en-US", { weekday: "short" });

  return (
    <Link href={`/marketplace/${ticket.id}`} className="group block animate-fade-in">
      <div
        className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden flex flex-col h-full
                   transition-all duration-200 hover:shadow-xl hover:-translate-y-1"
        style={{ boxShadow: "0 2px 12px rgba(15,23,42,0.08)" }}
      >
        {/* Gradient event banner */}
        <div
          className="relative h-[120px] flex items-end p-4"
          style={{ background: style.gradient }}
        >
          {/* Category badge */}
          <span className="absolute top-3 left-3 bg-white/20 backdrop-blur-sm text-white
                           text-[10px] font-bold uppercase tracking-widest px-2.5 py-1
                           rounded-full border border-white/30">
            {style.category}
          </span>

          {/* Best value badge */}
          {isBestValue && (
            <span className="absolute top-3 right-3 bg-[#F59E0B] text-white text-[10px]
                             font-bold px-2.5 py-1 rounded-full">
              ⭐ Best Value
            </span>
          )}

          {/* Emoji */}
          <span className="absolute bottom-4 right-4 text-4xl opacity-80 group-hover:scale-110 transition-transform">
            {style.emoji}
          </span>

          {/* Gradient text overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="relative z-10">
            <h3 className="text-white font-extrabold text-base leading-snug line-clamp-2
                           group-hover:text-white/90 transition-colors drop-shadow-sm">
              {ev.name}
            </h3>
          </div>
        </div>

        {/* Card body */}
        <div className="p-4 flex-1 flex flex-col justify-between gap-4">
          {/* Venue + date */}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#0F172A] line-clamp-1">
              {ev.venue}
            </p>
            <p className="text-xs text-[#64748B]">{ev.city}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <svg className="w-3.5 h-3.5 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium text-[#64748B]">
                {dayOfWeek}, {formattedDate}
              </span>
              {isUpcoming && (
                <span className="ml-auto text-[10px] font-semibold text-[#059669] bg-[#ECFDF5]
                                 px-2 py-0.5 rounded-full">Upcoming</span>
              )}
            </div>
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#F1F5F9]">
            <div>
              <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide">From</div>
              <div className="text-2xl font-extrabold text-[#0F172A] leading-tight">
                ${usdPrice.toLocaleString()}
              </div>
            </div>
            <div className="btn-primary px-4 py-2.5 text-sm font-bold rounded-xl flex-shrink-0 min-h-[44px] flex items-center">
              Buy Tickets
            </div>
          </div>
        </div>

        {/* Verified seller strip */}
        <div className="px-4 pb-3">
          <span className="text-[11px] text-[#059669] font-medium flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified seller · Instant delivery
          </span>
        </div>
      </div>
    </Link>
  );
}
