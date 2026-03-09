// ── Ticket Detail Page (Server Component) ─────────────────────
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase";
import { BuyTicketButton } from "@/components/BuyTicketButton";
import { QRTicket } from "@/components/QRTicket";
import { GuaranteeBanner } from "@/components/GuaranteeBanner";
import { WatchButton } from "@/components/WatchButton";
import { lamportsToSol, shortenAddress } from "@/lib/utils";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data } = await supabaseServer
    .from("tickets")
    .select("seat_section, seat_row, seat_number, price_lamports, events(name, venue, city, event_date)")
    .eq("id", params.id)
    .single();

  if (!data) return { title: "Ticket Not Found" };

  const ev        = data.events as any;
  const eventName = ev?.name ?? "Event";
  const venue     = ev?.venue ?? "";
  const city      = ev?.city ?? "";
  const date      = ev?.event_date
    ? new Date(ev.event_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";
  const priceUsd  = `$${Math.round((data.price_lamports / 1_000_000_000) * 150)}`;

  const title       = `${eventName} Tickets — ${city}, ${venue} | Ticket Mint`;
  const description = `Buy ${eventName} tickets for ${date} at ${venue} in ${city}. 100% verified tickets with buyer guarantee. Starting from ${priceUsd}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type:    "website",
      siteName: "Ticket Mint",
    },
    twitter: {
      card:        "summary",
      title,
      description,
    },
  };
}

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const { data: ticket, error } = await supabaseServer
    .from("tickets")
    .select(`
      id, mint_address, seller_wallet, owner_wallet,
      seat_section, seat_row, seat_number,
      price_lamports, original_price, listing_status,
      listed_at, sold_at,
      events ( id, name, venue, city, event_date, image_url, description )
    `)
    .eq("id", params.id)
    .single();

  if (error || !ticket) notFound();

  const event = ticket.events as any;
  const solPrice = lamportsToSol(ticket.price_lamports);
  const isListed = ticket.listing_status === "listed";
  const isSold   = ticket.listing_status === "sold";

  const { data: history } = await supabaseServer
    .from("transfer_history")
    .select("from_wallet, to_wallet, transfer_type, price_lamports, transferred_at, tx_signature")
    .eq("ticket_id", params.id)
    .order("transferred_at", { ascending: false })
    .limit(20);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#64748B] mb-6">
        <a href="/" className="hover:text-[#E8315A] transition-colors">Browse</a>
        <span className="text-[#CBD5E1]">/</span>
        <span className="text-[#0F172A] font-medium">{event.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column — ticket + QR */}
        <div className="lg:col-span-2 space-y-5">

          {/* Physical ticket mockup */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden animate-fade-in"
               style={{ boxShadow: "0 4px 16px rgba(15,23,42,0.08)" }}>
            {/* Color band */}
            <div
              className="h-36 relative flex items-end p-5"
              style={{
                background: event.image_url
                  ? `url(${event.image_url}) center/cover`
                  : "linear-gradient(135deg, #E8315A 0%, #7C3AED 100%)",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
              <div className="relative">
                <h2 className="text-white font-extrabold text-lg leading-tight">{event.name}</h2>
                <p className="text-white/70 text-sm mt-0.5">{event.venue}</p>
              </div>
            </div>

            {/* Perforation */}
            <div className="ticket-tear px-4">
              <div className="ticket-tear-line" />
            </div>

            {/* Seat details */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Section", value: ticket.seat_section },
                  { label: "Row",     value: ticket.seat_row },
                  { label: "Seat",    value: ticket.seat_number },
                ].map((item) => (
                  <div key={item.label} className="bg-[#F8F9FA] rounded-xl p-3 border border-[#F1F5F9]">
                    <div className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-semibold">
                      {item.label}
                    </div>
                    <div className="text-[#0F172A] font-extrabold text-2xl mt-1">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 text-sm pt-1">
                <InfoRow label="Date" value={new Date(event.event_date).toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric", year: "numeric",
                })} />
                <InfoRow label="Venue" value={`${event.venue}, ${event.city}`} />
              </div>
            </div>
          </div>

          {/* QR Code */}
          {ticket.mint_address && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
                 style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.05)" }}>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-4">
                Entry QR Code
              </p>
              <QRTicket mintAddress={ticket.mint_address} />
              <p className="text-xs text-[#94A3B8] text-center mt-3">
                Show this at the venue entrance
              </p>
            </div>
          )}
        </div>

        {/* Right column — purchase + details */}
        <div className="lg:col-span-3 space-y-5">

          {/* Price + Buy */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 animate-fade-in"
               style={{ boxShadow: "0 4px 16px rgba(15,23,42,0.08)" }}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-4xl font-extrabold text-[#0F172A]">${(solPrice * 150).toFixed(0)}</div>
              </div>
              <StatusBadge status={ticket.listing_status} />
            </div>

            {isListed && (
              <BuyTicketButton
                ticketId={ticket.id}
                pricelamports={ticket.price_lamports}
                mintAddress={ticket.mint_address ?? ""}
                sellerWallet={ticket.seller_wallet}
                eventName={event.name}
              />
            )}

            {/* Watch this event */}
            <div className="pt-2">
              <WatchButton eventId={event.id} />
            </div>

            {/* Buyer guarantee */}
            <GuaranteeBanner />

            {isSold && (
              <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-4 text-center">
                <p className="text-[#059669] font-semibold">This ticket has been sold</p>
                <p className="text-sm text-[#064E3B] mt-1 opacity-70">
                  Owned by {shortenAddress(ticket.owner_wallet ?? "")}
                </p>
              </div>
            )}

            {/* Fee breakdown */}
            <div className="mt-6 space-y-2 text-sm border-t border-[#F1F5F9] pt-5">
              <div className="flex justify-between text-[#64748B]">
                <span>Service fee (10%)</span>
                <span>${((solPrice * 150) * 0.10).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Seller fee (5%)</span>
                <span>${((solPrice * 150) * 0.05).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-[#0F172A] pt-2 border-t border-[#F1F5F9]">
                <span>Seller receives</span>
                <span>${((solPrice * 150) * 0.85).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Verification details */}
          {ticket.mint_address && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6"
                 style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.05)" }}>
              <h3 className="font-semibold text-[#0F172A] mb-4">Ticket Verification</h3>
              <div className="space-y-3">
                <InfoLinkRow
                  label="Ticket ID"
                  value={shortenAddress(ticket.mint_address)}
                  link={`https://solscan.io/token/${ticket.mint_address}?cluster=devnet`}
                />
                <InfoLinkRow
                  label="Seller"
                  value={shortenAddress(ticket.seller_wallet)}
                  link={`https://solscan.io/account/${ticket.seller_wallet}?cluster=devnet`}
                />
                {ticket.owner_wallet && (
                  <InfoLinkRow
                    label="Current Owner"
                    value={shortenAddress(ticket.owner_wallet)}
                    link={`https://solscan.io/account/${ticket.owner_wallet}?cluster=devnet`}
                  />
                )}
                <InfoRow label="Secured by" value="Blockchain" />
              </div>
            </div>
          )}

          {/* Activity */}
          {history && history.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6"
                 style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.05)" }}>
              <h3 className="font-semibold text-[#0F172A] mb-4">Ticket History</h3>
              <div className="space-y-0">
                {history.map((tx, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 border-b border-[#F8F9FA] last:border-0 text-sm"
                  >
                    <div>
                      <span className="font-medium text-[#0F172A] capitalize">{tx.transfer_type}</span>
                      <span className="text-[#94A3B8] ml-2 text-xs">
                        {new Date(tx.transferred_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-right">
                      {tx.price_lamports && (
                        <div className="text-[#0F172A] font-medium">◎ {lamportsToSol(tx.price_lamports)}</div>
                      )}
                      {tx.tx_signature && (
                        <a
                          href={`https://solscan.io/tx/${tx.tx_signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#E8315A] hover:underline"
                        >
                          {shortenAddress(tx.tx_signature)} ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    listed:    "badge-available",
    sold:      "badge-sold",
    cancelled: "badge-cancelled",
    draft:     "badge-draft",
  };
  const labels: Record<string, string> = {
    listed: "Available", sold: "Sold", cancelled: "Cancelled", draft: "Draft",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${map[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-[#64748B]">{label}</span>
      <span className="text-[#0F172A] font-medium">{value}</span>
    </div>
  );
}

function InfoLinkRow({ label, value, link }: { label: string; value: string; link: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-[#64748B]">{label}</span>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#E8315A] hover:underline font-mono"
      >
        {value} ↗
      </a>
    </div>
  );
}
