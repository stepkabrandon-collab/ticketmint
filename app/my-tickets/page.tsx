"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import Link from "next/link";
import { fetchWalletNFTs, type TicketNFT } from "@/lib/solana";
import { supabaseAnon } from "@/lib/supabase";
import { lamportsToSol, shortenAddress } from "@/lib/utils";
import { ResellModal } from "@/components/ResellModal";
import { QRTicket } from "@/components/QRTicket";
import { WalletButton } from "@/components/WalletButton";

export default function MyTicketsPage() {
  const { publicKey, connected } = useWallet();
  const [nfts, setNfts] = useState<TicketNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [resellTarget, setResellTarget] = useState<TicketNFT | null>(null);
  const [showQR, setShowQR] = useState<string | null>(null);

  const loadNFTs = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const tickets = await fetchWalletNFTs(publicKey.toBase58());
      setNfts(tickets);
      if (tickets.length > 0) {
        await Promise.allSettled(
          tickets.map((t) =>
            supabaseAnon
              .from("tickets")
              .update({ owner_wallet: publicKey.toBase58() })
              .eq("mint_address", t.mintAddress)
          )
        );
      }
    } catch (err) {
      console.error("[MyTickets] Failed to load:", err);
      toast.error("Failed to load your tickets. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (connected && publicKey) loadNFTs();
  }, [connected, publicKey, loadNFTs]);

  if (!connected) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="w-20 h-20 bg-[#FFF0F3] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🎟️</span>
        </div>
        <h1 className="text-2xl font-bold text-[#0F172A] mb-3">My Tickets</h1>
        <p className="text-[#64748B] mb-8">Connect your wallet to view your tickets.</p>
        <WalletButton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A]">My Tickets</h1>
          <p className="text-[#64748B] text-sm mt-1">
            Wallet:{" "}
            <span className="font-mono text-[#E8315A]">
              {shortenAddress(publicKey!.toBase58())}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadNFTs}
            disabled={loading}
            className="btn-secondary px-4 py-2 text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className={loading ? "animate-spin inline-block" : ""}>⟳</span>
            Refresh
          </button>
          <Link href="/list-ticket" className="btn-primary px-4 py-2 text-sm">
            + Sell a Ticket
          </Link>
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer h-64" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && nfts.length === 0 && (
        <div className="text-center py-24 bg-white rounded-2xl border border-[#E2E8F0]"
             style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}>
          <div className="w-16 h-16 bg-[#F8F9FA] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">🎫</span>
          </div>
          <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No tickets yet</h3>
          <p className="text-[#64748B] text-sm mb-6">
            Tickets you purchase will appear here.
          </p>
          <Link href="/" className="btn-primary px-6 py-3 text-sm">
            Browse Tickets
          </Link>
        </div>
      )}

      {/* Ticket grid */}
      {!loading && nfts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nfts.map((nft) => (
            <MyTicketCard
              key={nft.mintAddress}
              nft={nft}
              onResell={() => setResellTarget(nft)}
              onShowQR={() => setShowQR(showQR === nft.mintAddress ? null : nft.mintAddress)}
              showingQR={showQR === nft.mintAddress}
            />
          ))}
        </div>
      )}

      {resellTarget && (
        <ResellModal
          nft={resellTarget}
          onClose={() => setResellTarget(null)}
          onSuccess={() => {
            setResellTarget(null);
            loadNFTs();
            toast.success("Ticket listed for sale!");
          }}
        />
      )}
    </div>
  );
}

function MyTicketCard({
  nft, onResell, onShowQR, showingQR,
}: {
  nft: TicketNFT;
  onResell: () => void;
  onShowQR: () => void;
  showingQR: boolean;
}) {
  const attr = (key: string) => nft.attributes?.find((a) => a.trait_type === key)?.value ?? "—";

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#E8315A]
                    overflow-hidden animate-fade-in flex flex-col"
         style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-[#FFF8F9] border-b border-[#FEE2E8]">
        <h3 className="font-bold text-[#0F172A] text-sm leading-snug line-clamp-2">{nft.name}</h3>
        <p className="text-xs text-[#64748B] mt-0.5">{attr("venue")}</p>
      </div>

      {/* Seat grid */}
      <div className="px-4 pt-4 pb-3 flex-1 space-y-3">
        <div className="flex gap-2">
          {[
            { label: "Section", value: attr("seatSection") },
            { label: "Row",     value: attr("seatRow") },
            { label: "Seat",    value: attr("seatNumber") },
          ].map((item) => (
            <div key={item.label} className="flex-1 text-center bg-[#F8F9FA] rounded-lg py-2 px-1
                                              border border-[#F1F5F9]">
              <div className="text-[9px] text-[#94A3B8] uppercase font-semibold tracking-wide">
                {item.label}
              </div>
              <div className="text-[#0F172A] font-bold text-sm mt-0.5">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="space-y-1.5 text-xs text-[#64748B]">
          <div className="flex justify-between">
            <span>Event Date</span>
            <span className="text-[#0F172A] font-medium">{attr("eventDate")}</span>
          </div>
          <div className="flex justify-between">
            <span>Purchase Price</span>
            <span className="text-[#0F172A] font-medium">
              ◎ {lamportsToSol(Number(attr("originalPrice") || 0))}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Ticket ID</span>
            <a
              href={`https://solscan.io/token/${nft.mintAddress}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#E8315A] hover:underline font-mono"
            >
              {shortenAddress(nft.mintAddress)} ↗
            </a>
          </div>
        </div>

        {/* QR */}
        {showingQR && (
          <div className="pt-2 border-t border-[#F1F5F9]">
            <QRTicket mintAddress={nft.mintAddress} size={160} />
            <p className="text-xs text-[#94A3B8] text-center mt-2">Show at venue entrance</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={onShowQR}
          className="btn-secondary flex-1 py-2 text-sm font-semibold rounded-xl"
        >
          {showingQR ? "Hide QR" : "Show QR"}
        </button>
        <button
          onClick={onResell}
          className="btn-primary flex-1 py-2 text-sm font-bold rounded-xl"
        >
          Sell
        </button>
      </div>
    </div>
  );
}
