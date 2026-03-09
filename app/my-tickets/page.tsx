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

type Tab = "tickets" | "watchlist";

interface WatchlistItem {
  id: string;
  target_price: number | null;
  created_at: string;
  events: {
    id: string;
    name: string;
    venue: string;
    city: string;
    event_date: string;
  };
  lowestPriceUsd?: number | null;
}

export default function MyTicketsPage() {
  const { publicKey, connected } = useWallet();
  const [activeTab,     setActiveTab]     = useState<Tab>("tickets");
  const [nfts,          setNfts]          = useState<TicketNFT[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [resellTarget,  setResellTarget]  = useState<TicketNFT | null>(null);
  const [showQR,        setShowQR]        = useState<string | null>(null);
  const [watchlist,     setWatchlist]     = useState<WatchlistItem[]>([]);
  const [watchLoading,  setWatchLoading]  = useState(false);

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

  const loadWatchlist = useCallback(async () => {
    if (!publicKey) return;
    setWatchLoading(true);
    try {
      const res  = await fetch(`/api/watchlist?wallet=${publicKey.toBase58()}`);
      const data = await res.json();
      const items: WatchlistItem[] = data.items ?? [];

      // Fetch lowest ticket price for each watched event
      const withPrices = await Promise.all(
        items.map(async (item) => {
          const { data: cheapest } = await supabaseAnon
            .from("tickets")
            .select("price_lamports")
            .eq("event_id", item.events.id)
            .eq("listing_status", "listed")
            .order("price_lamports", { ascending: true })
            .limit(1)
            .maybeSingle();
          return {
            ...item,
            lowestPriceUsd: cheapest
              ? Math.round((cheapest.price_lamports / 1_000_000_000) * 150)
              : null,
          };
        })
      );
      setWatchlist(withPrices);
    } catch (err) {
      console.error("[Watchlist] Failed to load:", err);
    } finally {
      setWatchLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      loadNFTs();
      loadWatchlist();
    }
  }, [connected, publicKey, loadNFTs, loadWatchlist]);

  async function removeFromWatchlist(eventId: string) {
    if (!publicKey) return;
    await fetch("/api/watchlist", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ wallet: publicKey.toBase58(), eventId }),
    });
    setWatchlist((prev) => prev.filter((w) => w.events.id !== eventId));
    toast.success("Removed from watchlist");
  }

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
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A]">My Account</h1>
          <p className="text-[#64748B] text-sm mt-1">
            Wallet:{" "}
            <span className="font-mono text-[#E8315A]">
              {shortenAddress(publicKey!.toBase58())}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { loadNFTs(); loadWatchlist(); }}
            disabled={loading || watchLoading}
            className="btn-secondary px-4 py-2 text-sm flex items-center gap-1.5 disabled:opacity-50 min-h-[44px]"
          >
            <span className={(loading || watchLoading) ? "animate-spin inline-block" : ""}>⟳</span>
            Refresh
          </button>
          <Link href="/list-ticket" className="btn-primary px-4 py-2 text-sm min-h-[44px] flex items-center">
            + Sell a Ticket
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F1F5F9] p-1 rounded-xl mb-6 w-fit">
        {([
          { id: "tickets",   label: `My Tickets${nfts.length > 0 ? ` (${nfts.length})` : ""}` },
          { id: "watchlist", label: `Watchlist${watchlist.length > 0 ? ` (${watchlist.length})` : ""}` },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all min-h-[44px] ${
              activeTab === tab.id
                ? "bg-white text-[#0F172A] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── My Tickets tab ─────────────────────────────────────── */}
      {activeTab === "tickets" && (
        <>
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="shimmer h-64" />
              ))}
            </div>
          )}

          {!loading && nfts.length === 0 && (
            <div className="text-center py-24 bg-white rounded-2xl border border-[#E2E8F0]"
                 style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}>
              <div className="w-16 h-16 bg-[#F8F9FA] rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">🎫</span>
              </div>
              <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No tickets yet</h3>
              <p className="text-[#64748B] text-sm mb-6">Tickets you purchase will appear here.</p>
              <Link href="/" className="btn-primary px-6 py-3 text-sm">Browse Tickets</Link>
            </div>
          )}

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
        </>
      )}

      {/* ── Watchlist tab ───────────────────────────────────────── */}
      {activeTab === "watchlist" && (
        <>
          {watchLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="shimmer h-40" />)}
            </div>
          )}

          {!watchLoading && watchlist.length === 0 && (
            <div className="text-center py-24 bg-white rounded-2xl border border-[#E2E8F0]"
                 style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}>
              <div className="w-16 h-16 bg-[#F8F9FA] rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">🔔</span>
              </div>
              <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No watched events</h3>
              <p className="text-[#64748B] text-sm mb-6">
                Tap "Watch this event" on any listing to get price alerts.
              </p>
              <Link href="/" className="btn-primary px-6 py-3 text-sm">Browse Events</Link>
            </div>
          )}

          {!watchLoading && watchlist.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {watchlist.map((item) => {
                const atTarget =
                  item.target_price !== null &&
                  item.lowestPriceUsd !== null &&
                  item.lowestPriceUsd !== undefined &&
                  item.lowestPriceUsd <= item.target_price / 100;

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border overflow-hidden flex flex-col
                                ${atTarget ? "border-[#059669]" : "border-[#E2E8F0]"}`}
                    style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}
                  >
                    {/* Price alert banner */}
                    {atTarget && (
                      <div className="bg-[#ECFDF5] px-4 py-2 border-b border-[#A7F3D0]">
                        <p className="text-xs font-bold text-[#059669] flex items-center gap-1">
                          🎯 Price alert! Tickets are at your target price
                        </p>
                      </div>
                    )}

                    <div className="p-5 flex-1 space-y-3">
                      <div>
                        <h3 className="font-bold text-[#0F172A] text-sm leading-snug line-clamp-2">
                          {item.events.name}
                        </h3>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          {item.events.venue}, {item.events.city}
                        </p>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                          {new Date(item.events.event_date).toLocaleDateString("en-US", {
                            weekday: "short", month: "short", day: "numeric", year: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-[#F1F5F9]">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#64748B]">Lowest available</span>
                          <span className="font-semibold text-[#0F172A]">
                            {item.lowestPriceUsd != null ? `$${item.lowestPriceUsd}` : "Sold out"}
                          </span>
                        </div>
                        {item.target_price !== null && (
                          <div className="flex justify-between text-xs">
                            <span className="text-[#64748B]">Your target</span>
                            <span className={`font-semibold ${atTarget ? "text-[#059669]" : "text-[#0F172A]"}`}>
                              ${(item.target_price / 100).toFixed(0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-5 pb-4 flex gap-2">
                      <Link
                        href={`/?q=${encodeURIComponent(item.events.name)}`}
                        className="btn-primary flex-1 py-2.5 text-sm font-semibold rounded-xl text-center min-h-[44px] flex items-center justify-center"
                      >
                        View Tickets
                      </Link>
                      <button
                        onClick={() => removeFromWatchlist(item.events.id)}
                        className="btn-secondary px-3 py-2.5 text-sm rounded-xl min-h-[44px]"
                        title="Remove from watchlist"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
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
    <div
      className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#E8315A]
                 overflow-hidden animate-fade-in flex flex-col"
      style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}
    >
      <div className="px-4 pt-4 pb-3 bg-[#FFF8F9] border-b border-[#FEE2E8]">
        <h3 className="font-bold text-[#0F172A] text-sm leading-snug line-clamp-2">{nft.name}</h3>
        <p className="text-xs text-[#64748B] mt-0.5">{attr("venue")}</p>
      </div>

      <div className="px-4 pt-4 pb-3 flex-1 space-y-3">
        <div className="flex gap-2">
          {[
            { label: "Section", value: attr("seatSection") },
            { label: "Row",     value: attr("seatRow") },
            { label: "Seat",    value: attr("seatNumber") },
          ].map((item) => (
            <div
              key={item.label}
              className="flex-1 text-center bg-[#F8F9FA] rounded-lg py-2 px-1 border border-[#F1F5F9]"
            >
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

        {showingQR && (
          <div className="pt-2 border-t border-[#F1F5F9]">
            <QRTicket mintAddress={nft.mintAddress} size={160} />
            <p className="text-xs text-[#94A3B8] text-center mt-2">Show at venue entrance</p>
          </div>
        )}
      </div>

      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={onShowQR}
          className="btn-secondary flex-1 py-2.5 text-sm font-semibold rounded-xl min-h-[44px]"
        >
          {showingQR ? "Hide QR" : "Show QR"}
        </button>
        <button
          onClick={onResell}
          className="btn-primary flex-1 py-2.5 text-sm font-bold rounded-xl min-h-[44px]"
        >
          Sell
        </button>
      </div>
    </div>
  );
}
