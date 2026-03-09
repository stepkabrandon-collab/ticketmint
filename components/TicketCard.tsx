// ── TicketCard ─────────────────────────────────────────────────
// Marketplace grid card. Styled like a physical ticket stub:
// white card with a left coral accent, clean typography.
import Link from "next/link";
import type { TicketWithEvent } from "@/app/page";
import { lamportsToSol, shortenAddress } from "@/lib/utils";

// Soft accent colors for event banners (light theme friendly)
const EVENT_COLORS = [
  { bg: "#FFF0F3", accent: "#E8315A" },
  { bg: "#EFF6FF", accent: "#3B82F6" },
  { bg: "#F0FDF4", accent: "#16A34A" },
  { bg: "#FFF7ED", accent: "#EA580C" },
  { bg: "#F5F3FF", accent: "#7C3AED" },
];
function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return EVENT_COLORS[hash % EVENT_COLORS.length];
}

export function TicketCard({ ticket }: { ticket: TicketWithEvent }) {
  const ev = ticket.events;
  const solPrice = lamportsToSol(ticket.price_lamports);
  const color = colorForName(ev.name);
  const eventDate = new Date(ev.event_date);
  const isUpcoming = eventDate > new Date();

  return (
    <Link href={`/marketplace/${ticket.id}`} className="group block animate-fade-in">
      <div className="ticket-card flex flex-col h-full overflow-hidden">
        {/* Event color band + header */}
        <div
          className="px-4 pt-4 pb-3 flex items-start justify-between gap-2"
          style={{ background: color.bg }}
        >
          <div className="min-w-0">
            <h3 className="font-bold text-[#0F172A] text-sm leading-snug line-clamp-2 group-hover:text-[#E8315A] transition-colors">
              {ev.name}
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5 line-clamp-1">
              {ev.venue} · {ev.city}
            </p>
          </div>
          {/* Date badge */}
          <div
            className="flex-shrink-0 text-center rounded-lg px-2.5 py-1.5 min-w-[44px]"
            style={{ background: color.accent }}
          >
            <div className="text-[9px] text-white/80 uppercase font-semibold leading-none">
              {eventDate.toLocaleString("en-US", { month: "short" })}
            </div>
            <div className="text-white font-extrabold text-base leading-none mt-0.5">
              {eventDate.getDate()}
            </div>
          </div>
        </div>

        {/* Ticket tear line */}
        <div className="ticket-tear px-3">
          <div className="ticket-tear-line" />
        </div>

        {/* Seat + Price */}
        <div className="px-4 py-4 flex-1 flex flex-col justify-between gap-3 bg-white">
          {/* Seat grid */}
          <div className="flex gap-2">
            {[
              { label: "Section", value: ticket.seat_section },
              { label: "Row",     value: ticket.seat_row },
              { label: "Seat",    value: ticket.seat_number },
            ].map((item) => (
              <div key={item.label} className="flex-1 text-center bg-[#F8F9FA] rounded-lg py-2 px-1">
                <div className="text-[9px] text-[#64748B] uppercase tracking-wide font-semibold">
                  {item.label}
                </div>
                <div className="text-[#0F172A] font-bold text-sm mt-0.5 truncate">
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-extrabold text-[#0F172A]">
                ${(solPrice * 150).toFixed(0)}
              </div>
            </div>
            <div
              className="btn-primary px-4 py-2 text-xs font-semibold rounded-lg"
              style={{ fontSize: "12px", padding: "8px 16px" }}
            >
              Buy Now
            </div>
          </div>

          {/* Footer meta */}
          <div className="flex items-center justify-between text-xs text-[#94A3B8] pt-2
                          border-t border-[#F1F5F9]">
            <span className="text-[#059669] font-medium">✓ Verified Seller</span>
            {isUpcoming ? (
              <span className="text-[#059669] font-medium">● Upcoming</span>
            ) : (
              <span className="text-[#94A3B8]">Past event</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
