// ── Ticket Validation Page ─────────────────────────────────────
// Scanned from QR code at venue entrance.
// Shows on-chain validity status in plain language.

import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase";
import { validateTicketOnChain } from "@/lib/solana-server";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: { mintAddress: string } }): Promise<Metadata> {
  return { title: `Ticket Check — ${params.mintAddress.slice(0, 8)}…` };
}

export default async function ValidatePage({ params }: { params: { mintAddress: string } }) {
  const { mintAddress } = params;

  const { data: ticket } = await supabaseServer
    .from("tickets")
    .select(`
      id, mint_address, owner_wallet, seller_wallet,
      seat_section, seat_row, seat_number, listing_status,
      events ( name, venue, city, event_date )
    `)
    .eq("mint_address", mintAddress)
    .maybeSingle();

  const onChain = await validateTicketOnChain(mintAddress).catch(() => null);
  const event = ticket?.events as any;

  type ValidStatus = "valid" | "transferred" | "invalid" | "unknown";
  let status: ValidStatus = "unknown";
  let statusMessage = "";

  if (!ticket && !onChain) {
    status = "invalid";
    statusMessage = "This ticket could not be found or verified.";
  } else if (onChain && ticket) {
    if (ticket.listing_status === "sold" && onChain.currentOwner === ticket.owner_wallet) {
      status = "valid";
      statusMessage = "Valid ticket. Ownership verified.";
    } else if (ticket.listing_status === "listed") {
      status = "transferred";
      statusMessage = "This ticket is currently listed for resale.";
    } else if (onChain.currentOwner !== ticket.owner_wallet && ticket.owner_wallet) {
      status = "transferred";
      statusMessage = "This ticket has been transferred to another owner.";
    } else {
      status = "valid";
      statusMessage = "Ticket verified and authentic.";
    }
  } else if (onChain && !ticket) {
    status = "valid";
    statusMessage = "Ticket exists and is verified.";
  }

  const statusConfig: Record<ValidStatus, {
    bg: string; border: string; iconBg: string; icon: string; label: string; textColor: string;
  }> = {
    valid: {
      bg: "#ECFDF5", border: "#A7F3D0", iconBg: "#059669",
      icon: "✓", label: "Valid Ticket", textColor: "#065F46",
    },
    transferred: {
      bg: "#FFFBEB", border: "#FDE68A", iconBg: "#D97706",
      icon: "⚠", label: "Ownership Changed", textColor: "#92400E",
    },
    invalid: {
      bg: "#FEF2F2", border: "#FECACA", iconBg: "#DC2626",
      icon: "✕", label: "Invalid Ticket", textColor: "#991B1B",
    },
    unknown: {
      bg: "#F8F9FA", border: "#E2E8F0", iconBg: "#64748B",
      icon: "?", label: "Unable to Verify", textColor: "#475569",
    },
  };
  const cfg = statusConfig[status];

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      {/* Status card */}
      <div
        className="rounded-2xl border p-8 text-center mb-5"
        style={{ background: cfg.bg, borderColor: cfg.border }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: cfg.iconBg }}
        >
          <span className="text-white text-3xl font-black">{cfg.icon}</span>
        </div>
        <div
          className="text-2xl font-extrabold mb-2"
          style={{ color: cfg.textColor }}
        >
          {cfg.label}
        </div>
        <p className="text-sm" style={{ color: cfg.textColor, opacity: 0.75 }}>
          {statusMessage}
        </p>
      </div>

      {/* Ticket details */}
      {ticket && event && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden mb-4"
             style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#F1F5F9]">
            <h2 className="font-bold text-[#0F172A] text-lg">{event.name}</h2>
            <p className="text-sm text-[#64748B] mt-0.5">{event.venue}, {event.city}</p>
          </div>

          {/* Seat grid */}
          <div className="px-5 py-4">
            <div className="grid grid-cols-3 gap-3 text-center mb-4">
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

            <div className="space-y-2.5 text-sm">
              <Row label="Event Date" value={new Date(event.event_date).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })} />
              <Row
                label="Ticket Holder"
                value={
                  onChain?.currentOwner
                    ? `${onChain.currentOwner.slice(0, 8)}…${onChain.currentOwner.slice(-6)}`
                    : ticket.owner_wallet
                    ? `${ticket.owner_wallet.slice(0, 8)}…${ticket.owner_wallet.slice(-6)}`
                    : "—"
                }
              />
              <Row label="Ticket ID" value={`${mintAddress.slice(0, 8)}…${mintAddress.slice(-6)}`} />
            </div>
          </div>
        </div>
      )}

      {/* Verify link */}
      <a
        href={`https://solscan.io/token/${mintAddress}?cluster=devnet`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between bg-white border border-[#E2E8F0] rounded-xl px-4 py-3
                   hover:border-[#E8315A] transition-colors group text-sm"
        style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}
      >
        <span className="text-[#64748B] group-hover:text-[#0F172A] transition-colors">
          View full verification record
        </span>
        <span className="text-[#E8315A]">↗</span>
      </a>

      <p className="text-center text-xs text-[#94A3B8] mt-5">
        Checked at {new Date().toLocaleTimeString()} · Secured by Solana
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#F8F9FA] last:border-0">
      <span className="text-[#64748B]">{label}</span>
      <span className="text-[#0F172A] font-medium">{value}</span>
    </div>
  );
}
